import { NextRequest, NextResponse } from "next/server";

import { getMotorSaleDocuments } from "@/lib/motors/motor-sale-documents";
import { DocumentAccessError, verifyDocumentAccess } from "@/lib/documents/verify-document-access";

type RouteContext = {
  params: Promise<{ motorId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyDocumentAccess(request);
    const { motorId } = await context.params;
    const documents = await getMotorSaleDocuments(access.companyId, motorId.trim());
    return NextResponse.json(documents);
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[motors/documents]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load motor documents" },
      { status: 500 },
    );
  }
}
