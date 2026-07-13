import { NextRequest, NextResponse } from "next/server";

import type { ImportBatch, ImportBatchFile, ImportSuggestedRow } from "@/domain/import-batch";
import {
  getImportBatchAdmin,
  listImportBatchFilesAdmin,
  listImportSuggestedRowsAdmin,
} from "@/infrastructure/firestore/admin/import-batch-admin";
import {
  InventoryViewAccessError,
  verifyInventoryViewAccess,
} from "@/lib/auth/verify-inventory-view-access.server";

export const runtime = "nodejs";

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

function serializeRow(row: ImportSuggestedRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyInventoryViewAccess(request);
    const { batchId } = await context.params;
    const batch = await getImportBatchAdmin(access.companyId, batchId);
    if (!batch) {
      return NextResponse.json({ error: "Импорт не найден" }, { status: 404 });
    }

    const include = new URL(request.url).searchParams.get("include") ?? "";
    const wantsFiles = include.includes("files") || include === "all" || !include;
    const wantsRows = include.includes("rows") || include === "all" || !include;

    const [files, rows] = await Promise.all([
      wantsFiles ? listImportBatchFilesAdmin(batchId) : Promise.resolve([]),
      wantsRows ? listImportSuggestedRowsAdmin(batchId) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      batch: serializeBatch(batch),
      files: files.map(serializeFile),
      rows: rows.map(serializeRow),
    });
  } catch (error) {
    if (error instanceof InventoryViewAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/import-batches/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось загрузить импорт" },
      { status: 500 },
    );
  }
}
