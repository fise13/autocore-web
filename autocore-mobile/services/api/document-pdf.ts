import { mapDocumentError } from '@/lib/documents/map-document-error';
import { mobileFetchBlob } from '@/services/api/mobile-client';
import type { DocumentSlug } from '@/types/document';

function buildPdfPath(slug: DocumentSlug, orderId: string): string {
  return `/api/pdf/${slug}/${orderId}`;
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

export function buildDocumentFilename(slug: DocumentSlug, orderId: string, orderNumber?: string): string {
  const safeNumber = (orderNumber ?? orderId).replace(/[^\w.-]+/g, '_');
  return `${slug}-${safeNumber}.pdf`;
}
