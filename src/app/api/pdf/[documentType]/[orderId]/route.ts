import { NextRequest, NextResponse } from "next/server";

import { DOCUMENT_BY_SLUG, resolveDocumentSlug } from "@/lib/documents/document-types";
import {
  parseDocumentAggregateType,
  resolveDocumentContext,
} from "@/lib/documents/resolve-document-context";
import {
  assertOrderCompanyAccess,
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const aggregateType = parseDocumentAggregateType(request.nextUrl.searchParams.get("aggregate"));
    const documentContext = await resolveDocumentContext(access.companyId, orderId, aggregateType);
    await assertOrderCompanyAccess(access.companyId, documentContext.order.companyId);

    const { generateDocumentPdf } = await import("@/lib/documents/generate-pdf");
    const pdf = await generateDocumentPdf(slug, access.companyId, orderId, {
      theme: documentContext.theme,
      aggregateType,
    });
    const definition = DOCUMENT_BY_SLUG[slug];
    const inline = request.nextUrl.searchParams.get("inline") === "1";
    const filename = `${definition.slug}-${orderId}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[pdf]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
