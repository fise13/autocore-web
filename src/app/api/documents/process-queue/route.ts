import { NextRequest, NextResponse } from "next/server";

import {
  fetchNextPendingJob,
  processDocumentQueueJob,
} from "@/lib/documents/engine/document-queue";
import {
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";

export const runtime = "nodejs";
export const maxDuration = 60;

type QueueBody = {
  jobId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyDocumentAccess(request);
    const body = (await request.json().catch(() => ({}))) as QueueBody;

    const jobId = body.jobId?.trim() || (await fetchNextPendingJob(access.companyId))?.id;
    if (!jobId) {
      return NextResponse.json({ message: "No pending jobs" });
    }

    const result = await processDocumentQueueJob({
      companyId: access.companyId,
      jobId,
    });

    return NextResponse.json({ jobId, ...result });
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
