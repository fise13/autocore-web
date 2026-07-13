import { NextRequest, NextResponse } from "next/server";

import { processImportBatchPendingFiles } from "@/lib/import-batch/process-import-batch.server";
import {
  DOCUMENT_WORKER_HEADER,
  readDocumentWorkerSecret,
} from "@/lib/documents/engine/document-worker-auth";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const workerSecret = readDocumentWorkerSecret();
    const headerSecret = request.headers.get(DOCUMENT_WORKER_HEADER);
    const isWorker = Boolean(workerSecret && headerSecret && headerSecret === workerSecret);

    const body = (await request.json()) as {
      companyId?: string;
      batchId?: string;
      fileId?: string;
    };

    if (!body.companyId || !body.batchId) {
      return NextResponse.json({ error: "companyId and batchId required" }, { status: 400 });
    }

    if (!isWorker) {
      const access = await verifyInventoryImportAccess(request);
      if (access.companyId !== body.companyId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const result = await processImportBatchPendingFiles({
      companyId: body.companyId,
      batchId: body.batchId,
      fileId: body.fileId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/import-batches/process]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Process failed" },
      { status: 500 },
    );
  }
}
