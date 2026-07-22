import "server-only";

import type { ImportSuggestedRow } from "@/domain/import-batch";
import {
  getImportBatchAdmin,
  getImportBatchFileAdmin,
  listImportBatchFilesAdmin,
  updateImportBatchAdmin,
  updateImportBatchFileAdmin,
  upsertSuggestedRowsAdmin,
} from "@/infrastructure/firestore/admin/import-batch-admin";
import { resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import { readOpenRouterApiKey } from "@/infrastructure/openrouter/chat-completions.server";
import { extractEnginesFromImage } from "@/lib/document-import/engines-extract-ai";
import { analyzeTable, ingestFiles } from "@/lib/import";
import { parseNumericValue } from "@/lib/import/value-detectors";

async function downloadStorageFile(storagePath: string): Promise<Buffer> {
  const bucket = await resolveAdminStorageBucket();
  const [buf] = await bucket.file(storagePath).download();
  return Buffer.from(buf);
}

function rowSummary(row: {
  brandName: string;
  engineCode: string;
  serialCode: string;
}): string {
  const parts = [row.brandName, row.engineCode, row.serialCode].filter(Boolean);
  return parts.join(" · ") || "Двигатель";
}

function classifiedToSuggested(
  sourceFileId: string,
  analysisRows: ReturnType<typeof analyzeTable>["rows"],
  sheetHint?: string,
): Array<Omit<ImportSuggestedRow, "id" | "batchId" | "companyId" | "createdAt" | "updatedAt">> {
  return analysisRows
    .filter((row) => row.classification.recordType === "engine" || Boolean(row.values.serial))
    .map((row) => {
      const serial = (row.values.serial ?? "").trim();
      const brand = (row.values.brand ?? sheetHint ?? "").trim();
      const engineCode = (row.values.name ?? row.values.model ?? "").trim();
      const qty = parseNumericValue(row.values.quantity ?? "") ?? 1;
      const price = parseNumericValue(row.values.price ?? "");
      const confidence = row.confidence.score;
      return {
        sourceFileId,
        selected: confidence >= 0.4 && Boolean(serial || engineCode),
        confidence,
        serialCode: serial,
        brandName: brand || "Не указан",
        engineCode: engineCode || "—",
        configuration: (row.values.condition ?? "").trim(),
        notes: (row.values.comment ?? "").trim(),
        quantity: Math.max(1, Math.round(qty)),
        transmission: "",
        vin: (row.values.vin ?? "").trim() || undefined,
        price: price ?? null,
        compatibility: undefined,
        errors: row.issues.filter((i) => i.kind === "missing-required" || i.kind === "invalid-value").map((i) => i.message),
        warnings: row.issues
          .filter((i) => i.kind === "low-confidence" || i.kind === "duplicate" || i.kind === "unknown-type")
          .map((i) => i.message),
        summary: rowSummary({
          brandName: brand,
          engineCode,
          serialCode: serial,
        }),
      };
    });
}

async function processSpreadsheetFile(params: {
  companyId: string;
  batchId: string;
  fileId: string;
  buffer: Buffer;
  fileName: string;
}): Promise<number> {
  const ingest = await ingestFiles([
    {
      name: params.fileName,
      arrayBuffer: async () =>
        params.buffer.buffer.slice(
          params.buffer.byteOffset,
          params.buffer.byteOffset + params.buffer.byteLength,
        ) as ArrayBuffer,
    },
  ]);

  const suggested: Array<
    Omit<ImportSuggestedRow, "id" | "batchId" | "companyId" | "createdAt" | "updatedAt">
  > = [];

  for (const table of ingest.tables) {
    const analysis = analyzeTable(table);
    const sheetHint = table.name?.replace(/\.[^.]+$/, "") ?? "";
    suggested.push(...classifiedToSuggested(params.fileId, analysis.rows, sheetHint));
  }

  if (suggested.length === 0) {
    await updateImportBatchFileAdmin(params.batchId, params.fileId, {
      status: "extracted",
      error: null,
      ocrText: `Таблиц: ${ingest.tables.length}, строк не распознано`,
    });
    return 0;
  }

  await upsertSuggestedRowsAdmin(params.batchId, params.companyId, suggested);
  await updateImportBatchFileAdmin(params.batchId, params.fileId, {
    status: "extracted",
    error: null,
  });
  return suggested.length;
}

async function processVisionFile(params: {
  companyId: string;
  batchId: string;
  fileId: string;
  buffer: Buffer;
  contentType: string;
  fileName?: string;
}): Promise<number> {
  if (!readOpenRouterApiKey()) {
    await updateImportBatchFileAdmin(params.batchId, params.fileId, {
      status: "failed",
      error: "OpenRouter не настроен (OPENROUTER_API_KEY)",
    });
    return 0;
  }

  if (!params.contentType.startsWith("image/")) {
    await updateImportBatchFileAdmin(params.batchId, params.fileId, {
      status: "failed",
      error: "AI-распознавание для PDF пока не поддерживается — загрузите фото или Excel/CSV",
    });
    return 0;
  }

  const ai = await extractEnginesFromImage({
    buffer: params.buffer,
    fileName: params.fileName,
    mimeHint: params.contentType,
  });

  const suggested = ai.engines.map((engine) => {
    const serialCode = engine.serialCode.trim();
    const brandName = engine.brandName.trim() || "Не указан";
    const engineCode = engine.engineCode.trim() || "—";
    const confidence = engine.confidence;
    return {
      sourceFileId: params.fileId,
      selected: confidence >= 0.45 && Boolean(serialCode || engineCode !== "—"),
      confidence,
      serialCode,
      brandName,
      engineCode,
      configuration: engine.configuration.trim(),
      notes: engine.notes.trim(),
      quantity: Math.max(1, Math.round(engine.quantity || 1)),
      transmission: engine.transmission.trim(),
      vin: engine.vin.trim() || undefined,
      price: engine.price ?? null,
      compatibility: engine.compatibility.trim() || undefined,
      errors: [] as string[],
      warnings: [] as string[],
      summary: rowSummary({ brandName, engineCode, serialCode }),
    };
  });

  await updateImportBatchFileAdmin(params.batchId, params.fileId, {
    status: "extracted",
    ocrText: `AI: ${suggested.length} двигател.`,
    error: null,
  });

  if (suggested.length > 0) {
    await upsertSuggestedRowsAdmin(params.batchId, params.companyId, suggested);
  }

  return suggested.length;
}

export async function processImportBatchFile(params: {
  companyId: string;
  batchId: string;
  fileId: string;
}): Promise<{ rowsAdded: number }> {
  const batch = await getImportBatchAdmin(params.companyId, params.batchId);
  if (!batch) throw new Error("Batch not found");

  const file = await getImportBatchFileAdmin(params.batchId, params.fileId);
  if (!file) throw new Error("File not found");
  if (file.status === "extracted") return { rowsAdded: 0 };
  if (file.status === "failed" && !file.storagePath) return { rowsAdded: 0 };

  await updateImportBatchAdmin(params.batchId, {
    status: "processing",
    aiStatus: "processing",
    error: null,
  });
  await updateImportBatchFileAdmin(params.batchId, params.fileId, {
    status: "processing",
    error: null,
  });

  try {
    const buffer = await downloadStorageFile(file.storagePath);
    let rowsAdded = 0;

    if (file.kind === "spreadsheet") {
      rowsAdded = await processSpreadsheetFile({
        companyId: params.companyId,
        batchId: params.batchId,
        fileId: params.fileId,
        buffer,
        fileName: file.fileName || "import.xlsx",
      });
    } else if (file.kind === "image" || file.kind === "pdf") {
      rowsAdded = await processVisionFile({
        companyId: params.companyId,
        batchId: params.batchId,
        fileId: params.fileId,
        buffer,
        contentType: file.contentType,
        fileName: file.fileName,
      });
    } else {
      await updateImportBatchFileAdmin(params.batchId, params.fileId, {
        status: "failed",
        error: "Неподдерживаемый тип файла",
      });
    }

    const files = await listImportBatchFilesAdmin(params.batchId);
    const pending = files.some(
      (f) => f.status === "ready" || f.status === "processing" || f.status === "uploading",
    );
    await updateImportBatchAdmin(params.batchId, {
      status: pending ? "processing" : "review",
      aiStatus: pending ? "processing" : "done",
    });

    return { rowsAdded };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка обработки";
    await updateImportBatchFileAdmin(params.batchId, params.fileId, {
      status: "failed",
      error: message,
    });
    await updateImportBatchAdmin(params.batchId, {
      aiStatus: "failed",
      error: message,
      status: "review",
    });
    throw error;
  }
}

/** Process all ready files in a batch. */
export async function processImportBatchPendingFiles(params: {
  companyId: string;
  batchId: string;
  fileId?: string;
}): Promise<{ processed: number }> {
  const files = await listImportBatchFilesAdmin(params.batchId);
  const targets = params.fileId
    ? files.filter((f) => f.id === params.fileId)
    : files.filter((f) => f.status === "ready");

  let processed = 0;
  for (const file of targets) {
    await processImportBatchFile({
      companyId: params.companyId,
      batchId: params.batchId,
      fileId: file.id,
    });
    processed += 1;
  }
  return { processed };
}
