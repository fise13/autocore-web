import { NextRequest, NextResponse } from "next/server";

import type { DuplicateGroup, ReviewRow } from "@/components/migration/migration-types";
import { AccountAccessError } from "@/lib/auth/verify-account-access";
import { verifyMigrationAccess } from "@/lib/auth/verify-migration-access.server";
import {
  applyMigrationBatchAdmin,
  ensureMigrationWarehouseAdmin,
} from "@/lib/import/migration-commit.server";

export const runtime = "nodejs";
export const maxDuration = 300;

type CommitBody = {
  companyId?: string;
  action?: "prepare" | "batch";
  warehouseId?: string;
  rows?: ReviewRow[];
  duplicates?: DuplicateGroup[];
  skuCache?: Record<string, string>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CommitBody;
    const access = await verifyMigrationAccess(request, body.companyId?.trim());
    const action = body.action ?? "batch";

    if (action === "prepare") {
      const warehouseId = await ensureMigrationWarehouseAdmin(access.companyId, access.uid);
      return NextResponse.json({ warehouseId });
    }

    const warehouseId = body.warehouseId?.trim();
    const rows = body.rows ?? [];
    const duplicates = body.duplicates ?? [];
    const skuCache = body.skuCache ?? {};

    if (!warehouseId) {
      return NextResponse.json({ error: "warehouseId обязателен" }, { status: 400 });
    }

    const result = await applyMigrationBatchAdmin({
      uid: access.uid,
      companyId: access.companyId,
      warehouseId,
      rows,
      duplicates,
      skuCache,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[migration/commit]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось сохранить импорт" },
      { status: 500 },
    );
  }
}
