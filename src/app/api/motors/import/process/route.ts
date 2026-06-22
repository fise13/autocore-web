import { NextRequest, NextResponse } from "next/server";

import { processMotorImportJobOnServer } from "@/application/use-cases/motors/process-motor-import-job.server";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";

export const runtime = "nodejs";
export const maxDuration = 300;

type ProcessBody = {
  jobId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyInventoryImportAccess(request);
    const body = (await request.json().catch(() => ({}))) as ProcessBody;
    const jobId = body.jobId?.trim();

    if (!jobId) {
      return NextResponse.json({ error: "jobId обязателен" }, { status: 400 });
    }

    const job = await processMotorImportJobOnServer({
      companyId: access.companyId,
      uid: access.uid,
      jobId,
    });

    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[motors/import/process]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось обработать импорт" },
      { status: 500 },
    );
  }
}
