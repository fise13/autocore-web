import "server-only";

import {
  getDocumentImportJobAdmin,
  updateDocumentImportJobAdmin,
} from "@/infrastructure/firestore/admin/document-import-admin";
import { resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import { readOpenRouterApiKey } from "@/infrastructure/openrouter/chat-completions.server";
import {
  enginesExtractSchema,
  extractEnginesFromImage,
  type EnginesExtractResult,
} from "@/lib/document-import/engines-extract-ai";

/** @deprecated Prefer enginesExtractSchema — kept for existing imports. */
export const documentImportExtractSchema = enginesExtractSchema;

export type DocumentImportExtractedEngine = EnginesExtractResult["engines"][number];

export type DocumentImportExtractedData = {
  engines: DocumentImportExtractedEngine[];
  extractedAt: string;
};

async function downloadStorageFile(storagePath: string): Promise<Buffer> {
  const bucket = await resolveAdminStorageBucket();
  const [buf] = await bucket.file(storagePath).download();
  return Buffer.from(buf);
}

/**
 * Run vision AI on a single document-import job and persist extractedData.
 */
export async function extractDocumentImportJob(params: {
  companyId: string;
  jobId: string;
  force?: boolean;
}): Promise<{ extractedData: DocumentImportExtractedData; aiStatus: "done" | "failed" }> {
  const job = await getDocumentImportJobAdmin(params.companyId, params.jobId);
  if (!job) throw new Error("Документ не найден");

  if (
    !params.force &&
    job.aiStatus === "done" &&
    job.extractedData &&
    typeof job.extractedData === "object"
  ) {
    return {
      extractedData: job.extractedData as DocumentImportExtractedData,
      aiStatus: "done",
    };
  }

  if (!readOpenRouterApiKey()) {
    await updateDocumentImportJobAdmin(job.id, {
      aiStatus: "failed",
      error: "OpenRouter не настроен (OPENROUTER_API_KEY)",
    });
    throw new Error("OpenRouter не настроен. Задайте OPENROUTER_API_KEY.");
  }

  await updateDocumentImportJobAdmin(job.id, { aiStatus: "processing", error: null });

  try {
    if (!job.originalStoragePath) {
      throw new Error("Файл ещё не загружен в Storage");
    }

    if (!job.contentType.startsWith("image/")) {
      throw new Error("Распознавание поддерживает только изображения");
    }

    const buffer = await downloadStorageFile(job.originalStoragePath);
    const ai = await extractEnginesFromImage({
      buffer,
      fileName: job.fileName,
      mimeHint: job.contentType,
    });

    const extractedData: DocumentImportExtractedData = {
      engines: ai.engines,
      extractedAt: new Date().toISOString(),
    };

    await updateDocumentImportJobAdmin(job.id, {
      extractedData,
      aiStatus: "done",
      error: null,
    });

    return { extractedData, aiStatus: "done" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка AI";
    await updateDocumentImportJobAdmin(job.id, {
      aiStatus: "failed",
      error: message,
    });
    throw error;
  }
}
