import { DocumentContext } from "@/lib/documents/document-context";
import { DocumentSlug } from "@/lib/documents/document-types";
import { buildDocumentRenderModel } from "@/lib/documents/render-model/build-render-model";
import { DocumentTemplateVariant } from "@/lib/documents/templates/document-template-meta";
import { DocumentPdfRenderer } from "@/components/documents/engine/document-pdf-renderer";

type DocumentPdfTemplateProps = {
  context: DocumentContext;
  variant: DocumentTemplateVariant;
  qrDataUri?: string;
};

/** Enterprise PDF shell — all content from JSON render model + company branding. */
export function DocumentPdfTemplate({ context, variant, qrDataUri }: DocumentPdfTemplateProps) {
  const slug = variant as DocumentSlug;
  const model = buildDocumentRenderModel(context, slug, qrDataUri);
  return <DocumentPdfRenderer model={model} />;
}
