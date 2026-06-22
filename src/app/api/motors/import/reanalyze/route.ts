import { NextRequest, NextResponse } from "next/server";

import { reanalyzeMotorImportJobOnServer } from "@/application/use-cases/motors/process-motor-import-job.server";
import {
  loadMotorImportEngineRowsAdmin,
  getMotorImportJobAdmin,
  assertMotorImportCompanyAccess,
} from "@/infrastructure/firestore/admin/motor-import-admin";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";
import { MotorSheetMappingResult } from "@/lib/motors/import/types";

export const runtime = "nodejs";
export const maxDuration = 300;

type ReanalyzeBody = {
  jobId?: string;
  manualSheetMappings?: Record<string, MotorSheetMappingResult>;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyInventoryImportAccess(request);
    const body = (await request.json().catch(() => ({}))) as ReanalyzeBody;
    const jobId = body.jobId?.trim();

    if (!jobId || !body.manualSheetMappings) {
      return NextResponse.json({ error: "jobId и manualSheetMappings обязательны" }, { status: 400 });
    }

    const existing = await getMotorImportJobAdmin(jobId);
    if (!existing) {
      return NextResponse.json({ error: "Импорт не найден" }, { status: 404 });
    }
    assertMotorImportCompanyAccess(existing, access.companyId);

    const job = await reanalyzeMotorImportJobOnServer({
      companyId: access.companyId,
      uid: access.uid,
      jobId,
      manualSheetMappings: body.manualSheetMappings,
    });

    if (!job) {
      return NextResponse.json({ error: "Не удалось пересчитать импорт" }, { status: 500 });
    }

    const engineRows = await loadMotorImportEngineRowsAdmin(job);
    return NextResponse.json({
      jobId: job.id,
      engineRows,
      sheetMappings: Object.fromEntries(
        job.sheetConfigs.map((config) => [
          config.id,
          {
            config,
            columnMapping: job.columnMappings[config.id] ?? { columnMappings: [], headerRowIndex: null },
            confidence: 1,
            source: "manual" as const,
            warnings: [],
            detectedSoldSheet: false,
          },
        ]),
      ),
      stats: job.stats,
      quickImport: job.quickImport ?? false,
    });
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[motors/import/reanalyze]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось пересчитать импорт" },
      { status: 500 },
    );
  }
}
