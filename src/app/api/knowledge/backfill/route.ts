import { NextRequest, NextResponse } from "next/server";

import { backfillFromWorkOrders } from "@/infrastructure/firestore/admin/knowledge-admin";
import {
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const access = await verifyDocumentAccess(request);
    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    const processed = await backfillFromWorkOrders(access.companyId, body.limit ?? 200);
    return NextResponse.json({ processed });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[knowledge/backfill]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backfill failed" },
      { status: 500 },
    );
  }
}
