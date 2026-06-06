import { NextRequest, NextResponse } from "next/server";

import { loadDocumentContext } from "@/lib/documents/load-document-context";
import { ALL_DOCUMENT_SLUGS, isDocumentSlug } from "@/lib/documents/document-types";
import {
  assertOrderCompanyAccess,
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";

export const runtime = "nodejs";
export const maxDuration = 60;

type GenerateBody = {
  orderId?: string;
  types?: string[];
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyDocumentAccess(request);
    const body = (await request.json()) as GenerateBody;
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const slugs = (body.types ?? ALL_DOCUMENT_SLUGS).filter(isDocumentSlug);
    if (slugs.length === 0) {
      return NextResponse.json({ error: "No valid document types" }, { status: 400 });
    }

    const context = await loadDocumentContext(access.companyId, orderId);
    await assertOrderCompanyAccess(access.companyId, context.order.companyId);

    const { generateAndPersistAllDocuments } = await import("@/lib/documents/generate-documents");
    const documents = await generateAndPersistAllDocuments({
      companyId: access.companyId,
      workOrderId: orderId,
      context,
      slugs,
    });

    return NextResponse.json({
      documents: documents.map((document) => ({
        id: document.id,
        type: document.type,
        title: document.title,
        downloadUrl: document.downloadUrl,
      })),
    });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[documents/generate]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate documents" },
      { status: 500 },
    );
  }
}
