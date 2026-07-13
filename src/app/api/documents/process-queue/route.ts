import { NextRequest, NextResponse } from "next/server";

import {
  fetchNextPendingJob,
  processNextDocumentBatch,
} from "@/lib/documents/engine/document-queue";
import { kickDocumentQueueWorker } from "@/lib/documents/engine/kick-document-queue";
import {
  verifyDocumentQueueAccess,
} from "@/lib/documents/engine/document-worker-auth";
import {
  DocumentAccessError,
} from "@/lib/documents/verify-document-access";

export const runtime = "nodejs";
export const maxDuration = 60;

type QueueBody = {
  jobId?: string;
  companyId?: string;
  chain?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as QueueBody;
    const access = await verifyDocumentQueueAccess(request, body.companyId);
    const companyId = body.companyId?.trim() ? access.companyId : access.companyId;

    const jobId = body.jobId?.trim() || (await fetchNextPendingJob(companyId))?.id;
    if (!jobId) {
      return NextResponse.json({ message: "No pending jobs" });
    }

    const result = await processNextDocumentBatch({
      companyId,
      jobId,
    });

    if (result.hasMore && body.chain !== false) {
      await kickDocumentQueueWorker({
        origin: request.nextUrl.origin,
        companyId,
        jobId,
        authorization: request.headers.get("authorization"),
      });
    }

    return NextResponse.json({
      jobId,
      processedSlug: result.processedSlug,
      failedSlug: result.failedSlug,
      processedSlugs: result.processedSlugs,
      failedSlugsThisTick: result.failedSlugsThisTick,
      hasMore: result.hasMore,
      status: result.jobStatus,
      completed: result.completed,
      failed: result.failed,
    });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[documents/process-queue]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process queue" },
      { status: 500 },
    );
  }
}
