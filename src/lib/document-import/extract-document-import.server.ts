import "server-only";

import { z } from "zod";

import {
  getDocumentImportJobAdmin,
  updateDocumentImportJobAdmin,
} from "@/infrastructure/firestore/admin/document-import-admin";
import { resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import { callOpenRouterJson, readOpenRouterApiKey } from "@/infrastructure/openrouter/chat-completions.server";

export const documentImportExtractSchema = z.object({
  engines: z
    .array(
      z.object({
        serialCode: z.string().optional().default(""),
        brandName: z.string().optional().default(""),
        engineCode: z.string().optional().default(""),
        configuration: z.string().optional().default(""),
        notes: z.string().optional().default(""),
        quantity: z.number().optional().default(1),
        transmission: z.string().optional().default(""),
        vin: z.string().optional().default(""),
        price: z.number().nullable().optional(),
        compatibility: z.string().optional().default(""),
        confidence: z.number().min(0).max(1).optional().default(0.6),
      }),
    )
    .default([]),
});

export type DocumentImportExtractedEngine = z.infer<
  typeof documentImportExtractSchema
>["engines"][number];

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

    const buffer = await downloadStorageFile(job.originalStoragePath);
    const mime = job.contentType.startsWith("image/") ? job.contentType : "image/jpeg";
    const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

    const ai = await callOpenRouterJson(
      [
        {
          role: "system",
          content: `Ты извлекаешь двигатели со склада из фото авторазборки.
Верни JSON: { "engines": [ { serialCode, brandName, engineCode, configuration, notes, quantity, transmission, vin, price, compatibility, confidence } ] }.
confidence 0..1. Если данных нет — engines: []. Не выдумывай VIN.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Файл: ${job.fileName ?? "photo"}. Извлеки все двигатели на фото.`,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      documentImportExtractSchema,
      {
        title: "AutoCore Document Import",
        model: process.env.IMPORT_AI_MODEL?.trim() || process.env.OPENROUTER_MODEL?.trim(),
        maxTokens: 512,
      },
    );

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
