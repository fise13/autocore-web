import { NextRequest, NextResponse } from "next/server";

import { getSuggestions } from "@/infrastructure/firestore/admin/knowledge-admin";
import {
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const access = await verifyDocumentAccess(request);
    const { searchParams } = request.nextUrl;

    const result = await getSuggestions(access.companyId, {
      companyId: access.companyId,
      actorUserId: access.uid,
      engineCode: searchParams.get("engineCode") ?? undefined,
      brandName: searchParams.get("brandName") ?? undefined,
      clientId: searchParams.get("clientId") ?? undefined,
      mechanicId: searchParams.get("mechanicId") ?? undefined,
      fieldKey: searchParams.get("fieldKey") ?? undefined,
      query: searchParams.get("query") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 12) || 12,
    });

    return NextResponse.json({
      suggestions: result.suggestions,
      generatedAt: result.generatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[knowledge/suggest]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to suggest" },
      { status: 500 },
    );
  }
}
