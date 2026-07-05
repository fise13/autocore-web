import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { mapDocumentError } from '@/lib/documents/map-document-error';
import { writePdfCacheFile, writePdfDocumentFile } from '@/lib/documents/write-pdf-cache-file';
import { getPublicApiBaseUrl } from '@/services/api/api-base-url';
import {
  buildDocumentFilename,
  buildDocumentPdfPath,
  fetchDocumentPdf,
  fetchWorkOrderDocumentPdf,
  type DocumentAggregateType,
} from '@/services/api/document-pdf';
import { getFirebaseAuth } from '@/services/firebase';
import type { DocumentSlug } from '@/types/document';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error('Требуется авторизация');
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/pdf',
  };
}

async function downloadPdfToCache(
  slug: DocumentSlug,
  aggregateId: string,
  filename: string,
  options?: { aggregateType?: DocumentAggregateType },
): Promise<File> {
  const headers = await getAuthHeaders();
  const url = `${getPublicApiBaseUrl()}${buildDocumentPdfPath(slug, aggregateId, options)}`;
  const file = new File(Paths.cache, filename);

  try {
    if (file.exists) {
      file.delete();
    }

    await File.downloadFileAsync(url, file, {
      idempotent: true,
      headers,
    });
  } catch (error) {
    throw new Error(mapDocumentError(error, 'Не удалось получить PDF'));
  }

  if (!file.exists) {
    throw new Error(`Не удалось сохранить PDF «${filename}»`);
  }

  const size = file.info().size ?? 0;
  if (size <= 0) {
    file.delete();
    throw new Error('Сервер вернул пустой PDF');
  }

  return file;
}

async function ensurePdfFile(
  slug: DocumentSlug,
  orderId: string,
  orderNumber?: string,
): Promise<File> {
  const filename = buildDocumentFilename(slug, orderId, orderNumber);

  try {
    return await downloadPdfToCache(slug, orderId, filename);
  } catch {
    const bytes = await fetchWorkOrderDocumentPdf(slug, orderId);
    return writePdfCacheFile(filename, bytes);
  }
}

async function ensureWarrantyPdfFile(
  slug: DocumentSlug,
  warrantyId: string,
  serialCode?: string,
): Promise<File> {
  const filename = buildDocumentFilename(slug, serialCode ?? warrantyId);
  const options = { aggregateType: 'warranty' as const };

  try {
    return await downloadPdfToCache(slug, warrantyId, filename, options);
  } catch {
    const bytes = await fetchDocumentPdf(slug, warrantyId, options);
    return writePdfCacheFile(filename, bytes);
  }
}

export async function shareWorkOrderDocument(
  slug: DocumentSlug,
  orderId: string,
  orderNumber?: string,
): Promise<void> {
  const file = await ensurePdfFile(slug, orderId, orderNumber);
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('На этом устройстве недоступен обмен файлами');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: file.name,
  });
}

export async function printWorkOrderDocument(
  slug: DocumentSlug,
  orderId: string,
  orderNumber?: string,
): Promise<void> {
  const file = await ensurePdfFile(slug, orderId, orderNumber);
  await Print.printAsync({ uri: file.uri });
}

export async function saveWorkOrderDocument(
  slug: DocumentSlug,
  orderId: string,
  orderNumber?: string,
): Promise<string> {
  const filename = buildDocumentFilename(slug, orderId, orderNumber);
  const bytes = await fetchWorkOrderDocumentPdf(slug, orderId);
  const file = writePdfDocumentFile(filename, bytes);
  return file.uri;
}

export async function shareWarrantyDocument(
  slug: DocumentSlug,
  warrantyId: string,
  serialCode?: string,
): Promise<void> {
  const file = await ensureWarrantyPdfFile(slug, warrantyId, serialCode);
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('На этом устройстве недоступен обмен файлами');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: file.name,
  });
}

export async function printWarrantyDocument(
  slug: DocumentSlug,
  warrantyId: string,
  serialCode?: string,
): Promise<void> {
  const file = await ensureWarrantyPdfFile(slug, warrantyId, serialCode);
  await Print.printAsync({ uri: file.uri });
}
