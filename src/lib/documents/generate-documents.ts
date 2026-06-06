import "server-only";

import { WorkOrderDocument } from "@/domain/work-order";
import {
  ALL_DOCUMENT_SLUGS,
  DOCUMENT_BY_SLUG,
  DocumentSlug,
} from "@/lib/documents/document-types";
import { DocumentContext } from "@/lib/documents/document-context";
import { generateDocumentPdf } from "@/lib/documents/generate-pdf";
import { persistDocumentPdf } from "@/lib/documents/persist-document-pdf";

export async function generateAndPersistDocument(params: {
  slug: DocumentSlug;
  companyId: string;
  workOrderId: string;
  context: DocumentContext;
}): Promise<WorkOrderDocument> {
  const pdf = await generateDocumentPdf(params.slug, params.companyId, params.workOrderId, {
    theme: params.context.theme,
  });
  const definition = DOCUMENT_BY_SLUG[params.slug];

  return persistDocumentPdf({
    companyId: params.companyId,
    workOrderId: params.workOrderId,
    type: definition.type,
    pdf,
  });
}

export async function generateAndPersistAllDocuments(params: {
  companyId: string;
  workOrderId: string;
  context: DocumentContext;
  slugs?: DocumentSlug[];
}): Promise<WorkOrderDocument[]> {
  const slugs = params.slugs ?? ALL_DOCUMENT_SLUGS;
  const results: WorkOrderDocument[] = [];
  const concurrency = 2;

  for (let index = 0; index < slugs.length; index += concurrency) {
    const batch = slugs.slice(index, index + concurrency);
    const batchResults = await Promise.all(
      batch.map((slug) =>
        generateAndPersistDocument({
          slug,
          companyId: params.companyId,
          workOrderId: params.workOrderId,
          context: params.context,
        }),
      ),
    );
    results.push(...batchResults);
  }

  return results;
}

export async function generateDocumentPdfBuffer(params: {
  slug: DocumentSlug;
  companyId: string;
  orderId: string;
}): Promise<Buffer> {
  return generateDocumentPdf(params.slug, params.companyId, params.orderId);
}
