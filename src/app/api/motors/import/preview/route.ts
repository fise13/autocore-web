import { NextRequest, NextResponse } from "next/server";

import {
  assertMotorImportCompanyAccess,
  getMotorImportJobAdmin,
  loadMotorImportEngineRowsAdmin,
} from "@/infrastructure/firestore/admin/motor-import-admin";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";
import { previewFromMotorImportJob } from "@/lib/motors/import/preview-from-job";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const access = await verifyInventoryImportAccess(request);
    const jobId = request.nextUrl.searchParams.get("jobId")?.trim();

    if (!jobId) {
      return NextResponse.json({ error: "jobId обязателен" }, { status: 400 });
    }

    const job = await getMotorImportJobAdmin(jobId);
    if (!job) {
      return NextResponse.json({ error: "Импорт не найден" }, { status: 404 });
    }

    assertMotorImportCompanyAccess(job, access.companyId);

    const engineRows = await loadMotorImportEngineRowsAdmin(job);
    const preview = previewFromMotorImportJob(job, engineRows);

    return NextResponse.json({
      jobId,
      preview,
      rowCount: engineRows.length,
    });
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[motors/import/preview]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось загрузить preview" },
      { status: 500 },
    );
  }
}
