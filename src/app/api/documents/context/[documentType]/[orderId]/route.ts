import { NextRequest, NextResponse } from "next/server";

import { serializeDocumentContext } from "@/lib/documents/load-document-context";
import { resolveDocumentSlug } from "@/lib/documents/document-types";
import { mapDocumentError } from "@/lib/documents/map-document-error";
import { resolveDocumentContext } from "@/lib/documents/resolve-document-context";
import {
  assertOrderCompanyAccess,
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ documentType: string; orderId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { documentType, orderId } = await context.params;
    const slug = resolveDocumentSlug(documentType);
    if (!slug) {
      return NextResponse.json({ error: "Unknown document type" }, { status: 404 });
    }

    const access = await verifyDocumentAccess(request);
    const documentContext = await resolveDocumentContext(access.companyId, orderId, "work_order");
    await assertOrderCompanyAccess(access.companyId, documentContext.order.companyId);

    return NextResponse.json({
      slug,
      context: serializeDocumentContext(documentContext),
    });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[documents/context]", error);
    return NextResponse.json(
      {
        error: mapDocumentError(error, "Failed to load document context"),
      },
      { status: 500 },
    );
  }
}
