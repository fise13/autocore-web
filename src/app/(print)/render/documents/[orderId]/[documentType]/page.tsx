import { notFound } from "next/navigation";

import { RenderDocument } from "@/components/documents/registry/render-document";
import { resolveDocumentSlug } from "@/lib/documents/document-types";
import { withDocumentLocale } from "@/lib/documents/document-locale";
import { parseDocumentRenderToken } from "@/lib/documents/render-token";
import {
  parseDocumentAggregateType,
  resolveDocumentContext,
} from "@/lib/documents/resolve-document-context";
import { resolveDocumentQrDataUri } from "@/lib/documents/resolve-document-qr-data-uri";
import { getDocumentsCss } from "@/lib/documents/documents-css";
import { cn } from "@/lib/utils";
import { DocumentTheme } from "@/domain/company-branding";
import { setActiveUserCopyLocale } from "@/lib/user-copy";

type DocumentRenderPageProps = {
  params: Promise<{ orderId: string; documentType: string }>;
  searchParams: Promise<{
    token?: string;
    theme?: string;
    aggregate?: string;
    export?: string;
    lang?: string;
  }>;
};

export default async function DocumentRenderPage({ params, searchParams }: DocumentRenderPageProps) {
  const { orderId, documentType } = await params;
  const {
    token,
    theme: themeParam,
    aggregate: aggregateParam,
    export: exportParam,
    lang: langParam,
  } = await searchParams;
  const slug = resolveDocumentSlug(documentType);

  if (!slug || !token) notFound();

  const payload = parseDocumentRenderToken(token);
  if (!payload || payload.orderId !== orderId || payload.slug !== slug) notFound();

  const aggregateType = parseDocumentAggregateType(aggregateParam ?? payload.aggregateType);
  const context = await resolveDocumentContext(payload.companyId, orderId, aggregateType).catch(() => null);
  if (!context) notFound();

  const locale =
    langParam === "en" || langParam === "ru"
      ? langParam
      : payload.locale === "en" || payload.locale === "ru"
        ? payload.locale
        : undefined;
  if (locale) setActiveUserCopyLocale(locale);
  const localized = withDocumentLocale(context, locale);

  const resolvedTheme = (themeParam ?? localized.theme ?? "modern") as DocumentTheme;
  const contextWithTheme = { ...localized, theme: resolvedTheme };

  const qrDataUri = await resolveDocumentQrDataUri(slug, contextWithTheme);

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
