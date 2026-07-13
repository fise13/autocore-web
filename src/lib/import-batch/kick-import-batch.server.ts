import "server-only";

import { getAppUrl } from "@/lib/site-urls";
import { readDocumentWorkerSecret, DOCUMENT_WORKER_HEADER } from "@/lib/documents/engine/document-worker-auth";

type KickParams = {
  companyId: string;
  batchId: string;
  fileId?: string;
  origin?: string | null;
};

function isLocalDev(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    (process.env.NEXT_PUBLIC_APP_URL ?? "").includes("localhost")
  );
}

async function runInline(params: KickParams): Promise<void> {
  const { processImportBatchPendingFiles } = await import(
    "@/lib/import-batch/process-import-batch.server"
  );
  await processImportBatchPendingFiles({
    companyId: params.companyId,
    batchId: params.batchId,
    fileId: params.fileId,
  });
}

/**
 * Kick AI/spreadsheet processing for an import batch.
 * Local/dev: inline. Production: HTTP to process route.
 */
export async function kickImportBatchProcessing(params: KickParams): Promise<void> {
  const companyId = params.companyId?.trim();
  const batchId = params.batchId?.trim();
  if (!companyId || !batchId) return;

  if (isLocalDev()) {
    void runInline(params).catch((error) => {
      console.error("[kick-import-batch] inline", error);
    });
    return;
  }

  const origin = (params.origin?.trim() || getAppUrl()).replace(/\/$/, "");
  if (!origin) return;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const workerSecret = readDocumentWorkerSecret();
  if (workerSecret) {
    headers[DOCUMENT_WORKER_HEADER] = workerSecret;
  }

  void fetch(`${origin}/api/import-batches/process`, {
    method: "POST",
    headers,
    body: JSON.stringify({ companyId, batchId, fileId: params.fileId }),
  }).catch((error) => console.warn("[kick-import-batch] http", error));
}
