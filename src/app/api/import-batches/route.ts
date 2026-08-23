import { NextRequest, NextResponse } from "next/server";

import {
  createImportBatchAdmin,
  listImportBatchesAdmin,
} from "@/infrastructure/firestore/admin/import-batch-admin";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";
import {
  InventoryViewAccessError,
  verifyInventoryViewAccess,
} from "@/lib/auth/verify-inventory-view-access.server";
import type { ImportBatch, ImportBatchTarget } from "@/domain/import-batch";

export const runtime = "nodejs";

function serializeBatch(batch: ImportBatch) {
  return {
    ...batch,
    expiresAt: batch.expiresAt.toISOString(),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const access = await verifyInventoryViewAccess(request);
    const batches = await listImportBatchesAdmin(access.companyId);
    return NextResponse.json({ batches: batches.map(serializeBatch) });
  } catch (error) {
    if (error instanceof InventoryViewAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/import-batches]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load imports" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyInventoryImportAccess(request);
    let target: ImportBatchTarget = "motors";
    let title: string | undefined;
    try {
      const body = (await request.json()) as { target?: string; title?: string };
      if (body.target === "warehouse" || body.target === "auto" || body.target === "motors") {
        target = body.target;
      }
      if (typeof body.title === "string" && body.title.trim()) {
        title = body.title.trim().slice(0, 120);
      }
    } catch {
      // empty body is fine
    }

    const batch = await createImportBatchAdmin({
      companyId: access.companyId,
      createdBy: access.uid,
      target,
      title,
    });

    return NextResponse.json({ batch: serializeBatch(batch) }, { status: 201 });
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/import-batches POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create the import" },
      { status: 500 },
    );
  }
}
