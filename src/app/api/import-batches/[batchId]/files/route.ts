import { NextRequest, NextResponse } from "next/server";

import type { ImportBatch, ImportBatchFile } from "@/domain/import-batch";
import {
  addFileToImportBatchAdmin,
  getImportBatchAdmin,
} from "@/infrastructure/firestore/admin/import-batch-admin";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";
import { kickImportBatchProcessing } from "@/lib/import-batch/kick-import-batch.server";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

function serializeBatch(batch: ImportBatch) {
  return {
    ...batch,
    expiresAt: batch.expiresAt.toISOString(),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

function serializeFile(file: ImportBatchFile) {
  return {
    ...file,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

type RouteContext = { params: Promise<{ batchId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyInventoryImportAccess(request);
    const { batchId } = await context.params;

    const batch = await getImportBatchAdmin(access.companyId, batchId);
    if (!batch) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Attach a file" }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "The file is empty" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is too large (max 25 MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await addFileToImportBatchAdmin({
      companyId: access.companyId,
      batchId,
      buffer,
      contentType: file.type || "application/octet-stream",
      fileName: file.name || undefined,
    });

    void kickImportBatchProcessing({
      companyId: access.companyId,
      batchId,
      fileId: result.file.id,
    }).catch((error) => console.warn("[import-batches/files] kick failed", error));

    return NextResponse.json(
      {
        batch: serializeBatch(result.batch),
        file: serializeFile(result.file),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/import-batches/:id/files]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not upload the file" },
      { status: 500 },
    );
  }
}
