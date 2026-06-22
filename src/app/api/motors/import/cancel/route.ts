import { NextRequest, NextResponse } from "next/server";

import {
  assertMotorImportCompanyAccess,
  cancelMotorImportJobAdmin,
  getMotorImportJobAdmin,
} from "@/infrastructure/firestore/admin/motor-import-admin";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";

export const runtime = "nodejs";

type CancelBody = {
  jobId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyInventoryImportAccess(request);
    const body = (await request.json().catch(() => ({}))) as CancelBody;
    const jobId = body.jobId?.trim();

    if (!jobId) {
      return NextResponse.json({ error: "jobId обязателен" }, { status: 400 });
    }

    const existing = await getMotorImportJobAdmin(jobId);
    if (!existing) {
      return NextResponse.json({ error: "Импорт не найден" }, { status: 404 });
    }

    assertMotorImportCompanyAccess(existing, access.companyId);

    const job = await cancelMotorImportJobAdmin(jobId);
    return NextResponse.json({ jobId, status: job?.status ?? "cancelled" });
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[motors/import/cancel]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось отменить импорт" },
      { status: 500 },
    );
  }
}
