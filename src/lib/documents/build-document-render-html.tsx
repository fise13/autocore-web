import "server-only";

import { renderToStaticMarkup } from "react-dom/server";

import { RenderDocumentServer } from "@/components/documents/registry/render-document-server";
import { DocumentTheme } from "@/domain/company-branding";
import { getDocumentsCss } from "@/lib/documents/documents-css";
import { DocumentSlug } from "@/lib/documents/document-types";
import {
  parseDocumentAggregateType,
  resolveDocumentContext,
} from "@/lib/documents/resolve-document-context";
import { resolveDocumentQrDataUri } from "@/lib/documents/resolve-document-qr-data-uri";
import { cn } from "@/lib/utils";

export type BuildDocumentRenderHtmlParams = {
  companyId: string;
  orderId: string;
  slug: DocumentSlug;
  aggregateType?: "work_order" | "warranty" | "quote";
  theme?: DocumentTheme;
};

export async function buildDocumentRenderHtml(params: BuildDocumentRenderHtmlParams): Promise<string> {
  const aggregateType = parseDocumentAggregateType(params.aggregateType);
  const context = await resolveDocumentContext(params.companyId, params.orderId, aggregateType);
  const resolvedTheme = (params.theme ?? context.theme ?? "modern") as DocumentTheme;
  const contextWithTheme = { ...context, theme: resolvedTheme };
  const qrDataUri = await resolveDocumentQrDataUri(params.slug, contextWithTheme);
  const compiledCss = getDocumentsCss();

  const bodyMarkup = renderToStaticMarkup(
    <>
      <style dangerouslySetInnerHTML={{ __html: compiledCss }} />
      <div className={cn("documents-root bg-white print:bg-white", "documents-pdf-export")}>
        <RenderDocumentServer slug={params.slug} context={contextWithTheme} qrDataUri={qrDataUri} />
      </div>
    </>,
  );

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>${bodyMarkup}</body>
</html>`;
}
