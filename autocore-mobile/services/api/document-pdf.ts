import { mapDocumentError } from '@/lib/documents/map-document-error';
import { mobileFetchBlob } from '@/services/api/mobile-client';
import type { DocumentSlug } from '@/types/document';

export type DocumentAggregateType = 'work_order' | 'warranty';

export function buildDocumentPdfPath(
  slug: DocumentSlug,
  aggregateId: string,
  options?: { aggregateType?: DocumentAggregateType },
): string {
  const params = new URLSearchParams();
  if (options?.aggregateType && options.aggregateType !== 'work_order') {
    params.set('aggregate', options.aggregateType);
  }
  const query = params.size > 0 ? `?${params.toString()}` : '';
  return `/api/pdf/${slug}/${aggregateId}${query}`;
}

function buildPdfPath(
  slug: DocumentSlug,
  aggregateId: string,
  options?: { aggregateType?: DocumentAggregateType },
): string {
  return buildDocumentPdfPath(slug, aggregateId, options);
}

export async function fetchWorkOrderDocumentPdf(
  slug: DocumentSlug,
  orderId: string,
): Promise<ArrayBuffer> {
  try {
    return await mobileFetchBlob(buildPdfPath(slug, orderId));
  } catch (error) {
    throw new Error(mapDocumentError(error, 'Не удалось получить PDF'));
  }
}

export async function fetchDocumentPdf(
  slug: DocumentSlug,
  aggregateId: string,
  options?: { aggregateType?: DocumentAggregateType },
): Promise<ArrayBuffer> {
  try {
    return await mobileFetchBlob(buildPdfPath(slug, aggregateId, options));
  } catch (error) {
    throw new Error(mapDocumentError(error, 'Не удалось получить PDF'));
  }
}

export function buildDocumentFilename(slug: DocumentSlug, orderId: string, orderNumber?: string): string {
  const safeNumber = (orderNumber ?? orderId).replace(/[^\w.-]+/g, '_');
  return `${slug}-${safeNumber}.pdf`;
}
