import { DocumentTemplatePreviewClient } from "@/components/documents/preview/document-template-preview-client";
import { resolveDocumentSlug } from "@/lib/documents/document-types";
import { notFound } from "next/navigation";

type DocumentTemplatePreviewPageProps = {
  params: Promise<{ documentType: string }>;
};

export default async function DocumentTemplatePreviewPage({
  params,
}: DocumentTemplatePreviewPageProps) {
  const { documentType } = await params;
  const slug = resolveDocumentSlug(documentType);
  if (!slug) notFound();

  return <DocumentTemplatePreviewClient slug={slug} />;
}
