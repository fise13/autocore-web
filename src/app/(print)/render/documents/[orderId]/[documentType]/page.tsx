import { notFound } from "next/navigation";

import { RenderDocument } from "@/components/documents/registry/render-document";
import { resolveDocumentSlug } from "@/lib/documents/document-types";
import { buildDocumentQrDataUri } from "@/lib/documents/qr-code";
import { parseDocumentRenderToken } from "@/lib/documents/render-token";
import {
  parseDocumentAggregateType,
  resolveDocumentContext,
} from "@/lib/documents/resolve-document-context";
import { documentVehicleHistoryUrl } from "@/lib/documents/work-order-insights";
import { buildWarrantyVerifyUrl } from "@/components/documents/shared/document-qr";
import { getDocumentsCss } from "@/lib/documents/documents-css";
import { cn } from "@/lib/utils";
import { DocumentTheme } from "@/domain/company-branding";

type DocumentRenderPageProps = {
  params: Promise<{ orderId: string; documentType: string }>;
  searchParams: Promise<{ token?: string; theme?: string; aggregate?: string; export?: string }>;
};

export default async function DocumentRenderPage({ params, searchParams }: DocumentRenderPageProps) {
  const { orderId, documentType } = await params;
  const { token, theme: themeParam, aggregate: aggregateParam, export: exportParam } = await searchParams;
  const slug = resolveDocumentSlug(documentType);

  if (!slug || !token) notFound();

  const payload = parseDocumentRenderToken(token);
  if (!payload || payload.orderId !== orderId || payload.slug !== slug) notFound();

  const aggregateType = parseDocumentAggregateType(aggregateParam ?? payload.aggregateType);
  const context = await resolveDocumentContext(payload.companyId, orderId, aggregateType).catch(() => null);
  if (!context) notFound();

  const resolvedTheme = (themeParam ?? context.theme ?? "modern") as DocumentTheme;
  const contextWithTheme = { ...context, theme: resolvedTheme };

  const qrDataUri =
    slug === "work-order"
      ? await buildDocumentQrDataUri(documentVehicleHistoryUrl(contextWithTheme)).catch(() => undefined)
      : slug === "engine-warranty" && contextWithTheme.warrantyVerificationToken
        ? await buildDocumentQrDataUri(buildWarrantyVerifyUrl(contextWithTheme.warrantyVerificationToken)).catch(
            () => undefined,
          )
        : undefined;

  const compiledCss = getDocumentsCss();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: compiledCss }} />
      <div
        className={cn(
          "documents-root bg-white print:bg-white",
          exportParam === "pdf" && "documents-pdf-export",
        )}
      >
        <RenderDocument slug={slug} context={contextWithTheme} qrDataUri={qrDataUri} />
      </div>
    </>
  );
}
