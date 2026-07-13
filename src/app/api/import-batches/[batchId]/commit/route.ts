import { NextRequest, NextResponse } from "next/server";

import {
  commitImportBatchMotors,
  rollbackImportBatchMotors,
} from "@/lib/import-batch/commit-import-batch.server";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";

export const runtime = "nodejs";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ batchId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyInventoryImportAccess(request);
    const { batchId } = await context.params;
    let rowIds: string[] | undefined;
    try {
      const body = (await request.json()) as { rowIds?: string[] };
      if (Array.isArray(body.rowIds)) rowIds = body.rowIds.map(String);
    } catch {
      // empty body ok
    }

    const result = await commitImportBatchMotors({
      companyId: access.companyId,
      uid: access.uid,
      batchId,
      rowIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/import-batches/commit]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось импортировать" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyInventoryImportAccess(request);
    const { batchId } = await context.params;
    const result = await rollbackImportBatchMotors({
      companyId: access.companyId,
      uid: access.uid,
      batchId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/import-batches/rollback]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось откатить" },
      { status: 500 },
    );
  }
}
