import { DocumentPreviewClient } from "@/components/documents/preview/document-preview-client";
import { resolveDocumentSlug } from "@/lib/documents/document-types";
import { notFound } from "next/navigation";

type DocumentPreviewPageProps = {
  params: Promise<{ orderId: string; documentType: string }>;
};

export default async function DocumentPreviewPage({ params }: DocumentPreviewPageProps) {
  const { orderId, documentType } = await params;
  const slug = resolveDocumentSlug(documentType);
  if (!slug) notFound();

  return <DocumentPreviewClient orderId={orderId} slug={slug} />;
}
