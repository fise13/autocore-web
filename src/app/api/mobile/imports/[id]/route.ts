import { NextRequest, NextResponse } from "next/server";

import { getDocumentImportJobAdmin } from "@/infrastructure/firestore/admin/document-import-admin";
import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyMobileAccess(request, "inventory_view");
    const { id } = await context.params;
    const job = await getDocumentImportJobAdmin(access.companyId, id);
    if (!job) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      previewDownloadUrl: job.previewDownloadUrl,
      originalDownloadUrl: job.originalDownloadUrl,
      width: job.width,
      height: job.height,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/imports/id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load the document" },
      { status: 500 },
    );
  }
}
