import { NextRequest, NextResponse } from "next/server";

import { DOCUMENT_BY_SLUG, resolveDocumentSlug } from "@/lib/documents/document-types";
import {
  parseDocumentAggregateType,
  resolveDocumentContext,
} from "@/lib/documents/resolve-document-context";
import { mapDocumentError } from "@/lib/documents/map-document-error";
import {
  assertOrderCompanyAccess,
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";
import {
  findActiveDocumentJob,
  isBrowserSafeHttpUrl,
  readCachedWorkOrderPdf,
  readCachedWorkOrderPdfMetadata,
} from "@/lib/documents/resolve-cached-document-pdf";
import { isLikelyBlankPdf } from "@/lib/documents/pdf-buffer-quality";

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
    const forceFresh = request.nextUrl.searchParams.get("fresh") === "1";
    const definition = DOCUMENT_BY_SLUG[slug];
    const inline = request.nextUrl.searchParams.get("inline") === "1";
    const filename = `${definition.slug}-${orderId}.pdf`;

    // Fast path: serve cached PDF without loading full document context / AI polish.
    if (!forceFresh && aggregateType === "work_order") {
      const cached = await readCachedWorkOrderPdfMetadata({
        companyId: access.companyId,
        workOrderId: orderId,
        slug,
      });

      if (cached && (cached.downloadUrl || cached.storagePath)) {
        try {
          const { touchWorkOrderDocumentAccess } = await import("@/lib/documents/persist-document-pdf");
          await touchWorkOrderDocumentAccess({
            companyId: access.companyId,
            workOrderId: orderId,
            type: definition.type,
          });
        } catch {
          // Non-fatal.
        }

        const pdf = await readCachedWorkOrderPdf({
          companyId: access.companyId,
          workOrderId: orderId,
          slug,
        });

        if (pdf && !isLikelyBlankPdf(pdf)) {
          if (
            request.nextUrl.searchParams.get("redirect") !== "0" &&
            cached.downloadUrl &&
            isBrowserSafeHttpUrl(cached.downloadUrl)
          ) {
            return NextResponse.redirect(cached.downloadUrl, 302);
          }

          return new NextResponse(new Uint8Array(pdf), {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
              "Cache-Control": "private, max-age=3600",
              "X-Document-Source": "cache",
            },
          });
        }

        // Blank/corrupt cache — fall through to regenerate below.
        console.warn("[pdf] blank cached PDF, regenerating", {
          orderId,
          slug,
          bytes: pdf?.length ?? 0,
        });
      } else {
        const activeJob = await findActiveDocumentJob({
          companyId: access.companyId,
          aggregateId: orderId,
        });
        if (activeJob) {
          return NextResponse.json(
            {
              status: "generating",
              jobId: activeJob.id,
              jobStatus: activeJob.status,
              message: "PDF формируется в фоне. Повторите через несколько секунд.",
            },
            { status: 202 },
          );
        }

        // No cache and no job — regenerate on demand instead of 202 missing.
      }
    }

    const documentContext = await resolveDocumentContext(access.companyId, orderId, aggregateType);
    await assertOrderCompanyAccess(access.companyId, documentContext.order.companyId);

    const { generateDocumentPdf } = await import("@/lib/documents/generate-pdf");
    const pdf = await generateDocumentPdf(slug, access.companyId, orderId, {
      theme: documentContext.theme,
      aggregateType,
    });

    if (aggregateType === "work_order" && pdf) {
      try {
        const { persistDocumentPdf } = await import("@/lib/documents/persist-document-pdf");
        await persistDocumentPdf({
          companyId: access.companyId,
          workOrderId: orderId,
          type: definition.type,
          slug,
          pdf,
        });
      } catch (persistError) {
        console.warn("[pdf] history persist skipped:", persistError);
      }
    }

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
        "X-Document-Source": "generated",
      },
    });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[pdf]", error);
    return NextResponse.json(
      { error: mapDocumentError(error, "Failed to generate PDF") },
      { status: 500 },
    );
  }
}
