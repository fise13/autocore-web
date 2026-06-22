import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

import { applyMotorImportJobOnServer } from "@/application/use-cases/motors/process-motor-import-job.server";
import {
  assertMotorImportCompanyAccess,
  claimMotorImportJobForApply,
  getMotorImportJobAdmin,
  resetStuckMotorImportApply,
  updateMotorImportJobMappings,
} from "@/infrastructure/firestore/admin/motor-import-admin";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";
import { SheetColumnMapping } from "@/lib/motors/excel-column-mapping";
import { SheetImportConfig } from "@/lib/motors/excel-sheet-config";

export const runtime = "nodejs";
export const maxDuration = 300;

type ApplyBody = {
  jobId?: string;
  sheetConfigs?: SheetImportConfig[];
  columnMappings?: Record<string, SheetColumnMapping>;
};

async function claimApplyJob(jobId: string) {
  let claimResult = await claimMotorImportJobForApply(jobId);
  if (!claimResult) return null;
  if (claimResult.claimed) return claimResult;
  if (claimResult.job.status !== "applying") return claimResult;
  const reset = await resetStuckMotorImportApply(jobId);
  if (!reset) return claimResult;
  claimResult = await claimMotorImportJobForApply(jobId);
  return claimResult;
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyInventoryImportAccess(request);
    const body = (await request.json().catch(() => ({}))) as ApplyBody;
    const jobId = body.jobId?.trim();

    if (!jobId) {
      return NextResponse.json({ error: "jobId обязателен" }, { status: 400 });
    }

    const existing = await getMotorImportJobAdmin(jobId);
    if (!existing) {
      return NextResponse.json({ error: "Импорт не найден" }, { status: 404 });
    }
    assertMotorImportCompanyAccess(existing, access.companyId);

    if (body.sheetConfigs?.length && body.columnMappings) {
      await updateMotorImportJobMappings(jobId, body.sheetConfigs, body.columnMappings);
    }

    const claimResult = await claimApplyJob(jobId);
    if (!claimResult) {
      return NextResponse.json({ error: "Импорт не найден" }, { status: 404 });
    }

    if (!claimResult.claimed) {
      return NextResponse.json(
        { jobId, status: claimResult.job.status },
        { status: claimResult.job.status === "applying" ? 202 : 200 },
      );
    }

    after(async () => {
      try {
        await applyMotorImportJobOnServer({
          companyId: access.companyId,
          uid: access.uid,
          jobId,
          skipClaim: true,
        });
      } catch (error) {
        console.error("[motors/import/apply]", error);
      }
    });

    return NextResponse.json({ jobId, status: "applying" }, { status: 202 });
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[motors/import/apply]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось применить импорт" },
      { status: 500 },
    );
  }
}
