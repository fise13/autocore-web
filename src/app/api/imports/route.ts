import { NextRequest, NextResponse } from "next/server";

import type { DocumentImportJob } from "@/domain/document-import";
import { listDocumentImportJobsAdmin } from "@/infrastructure/firestore/admin/document-import-admin";
import {
  InventoryViewAccessError,
  verifyInventoryViewAccess,
} from "@/lib/auth/verify-inventory-view-access.server";

export const runtime = "nodejs";

function serializeJob(job: DocumentImportJob) {
  return {
    ...job,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const access = await verifyInventoryViewAccess(request);
    const jobs = await listDocumentImportJobsAdmin(access.companyId);
    return NextResponse.json({ jobs: jobs.map(serializeJob) });
  } catch (error) {
    if (error instanceof InventoryViewAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/imports]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load imports" },
      { status: 500 },
    );
  }
}
