import { NextRequest, NextResponse } from "next/server";

import { extractDocumentImportJob } from "@/lib/document-import/extract-document-import.server";
import {
  InventoryViewAccessError,
  verifyInventoryViewAccess,
} from "@/lib/auth/verify-inventory-view-access.server";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyInventoryViewAccess(request);
    const { id } = await context.params;
    const force = new URL(request.url).searchParams.get("force") === "1";
    const result = await extractDocumentImportJob({
      companyId: access.companyId,
      jobId: id,
      force,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InventoryViewAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/imports/extract]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not recognise it" },
      { status: 500 },
    );
  }
}
