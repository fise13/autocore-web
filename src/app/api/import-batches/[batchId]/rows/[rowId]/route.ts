import { NextRequest, NextResponse } from "next/server";

import type { ImportSuggestedRow } from "@/domain/import-batch";
import {
  getImportBatchAdmin,
  updateSuggestedRowAdmin,
} from "@/infrastructure/firestore/admin/import-batch-admin";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ batchId: string; rowId: string }> };

function serializeRow(row: ImportSuggestedRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyInventoryImportAccess(request);
    const { batchId, rowId } = await context.params;
    const batch = await getImportBatchAdmin(access.companyId, batchId);
    if (!batch) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    const body = (await request.json()) as Partial<ImportSuggestedRow>;
    const row = await updateSuggestedRowAdmin(batchId, rowId, body);
    if (!row) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }

    return NextResponse.json({ row: serializeRow(row) });
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/import-batches/rows PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update the row" },
      { status: 500 },
    );
  }
}
