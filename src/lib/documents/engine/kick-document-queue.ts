import "server-only";

import { getAppUrl } from "@/lib/site-urls";
import { readDocumentWorkerSecret, DOCUMENT_WORKER_HEADER } from "./document-worker-auth";

type KickDocumentQueueParams = {
  origin?: string | null;
  companyId: string;
  jobId: string;
  authorization?: string | null;
};

function isLocalDevOrigin(origin: string): boolean {
  const lower = origin.toLowerCase();
  return (
    process.env.NODE_ENV === "development" ||
    lower.includes("localhost") ||
    lower.includes("127.0.0.1")
  );
}

/** Process the job in this Node process (avoids Next.js self-HTTP deadlocks in local dev). */
async function runQueueInline(companyId: string, jobId: string): Promise<void> {
  const { processNextDocumentBatch } = await import("@/lib/documents/engine/document-queue");
  let hasMore = true;
  let guard = 0;
  while (hasMore && guard < 8) {
    const result = await processNextDocumentBatch({ companyId, jobId });
    hasMore = result.hasMore;
    guard += 1;
  }
}

/**
 * Kick document PDF generation.
 * - Local/dev: inline batch processing (reliable; no self-fetch).
 * - Production: HTTP call to /api/documents/process-queue (new serverless invocation).
 */
export async function kickDocumentQueueWorker(params: KickDocumentQueueParams): Promise<void> {
  const companyId = params.companyId?.trim();
  const jobId = params.jobId?.trim();
  if (!companyId || !jobId) return;

  const origin = (params.origin?.trim() || getAppUrl()).replace(/\/$/, "");

  if (isLocalDevOrigin(origin)) {
    void runQueueInline(companyId, jobId).catch((error) => {
      console.error("[kick-document-queue] inline", error);
    });
    return;
  }

  if (!origin) {
    console.warn("[kick-document-queue] no origin — skip", { companyId, jobId });
    return;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const workerSecret = readDocumentWorkerSecret();
  if (workerSecret) {
    headers[DOCUMENT_WORKER_HEADER] = workerSecret;
  } else if (params.authorization) {
    headers.Authorization = params.authorization;
  } else {
    console.warn("[kick-document-queue] no worker secret or authorization — skip", {
      companyId,
      jobId,
    });
    return;
  }

  const url = `${origin}/api/documents/process-queue`;
  void fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ companyId, jobId, chain: true }),
  }).catch((error) => {
    console.error("[kick-document-queue]", error);
  });
}
