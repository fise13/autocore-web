import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { mapDocumentError } from '@/lib/documents/map-document-error';
import { writePdfCacheFile } from '@/lib/documents/write-pdf-cache-file';
import { getPublicApiBaseUrl } from '@/services/api/api-base-url';
import {
  buildDocumentFilename,
  buildDocumentPdfPath,
  fetchDocumentPdf,
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

async function downloadRemotePdf(url: string, filename: string, headers?: Record<string, string>): Promise<File> {
  const file = new File(Paths.cache, filename);

  if (file.exists) {
    file.delete();
  }

  await File.downloadFileAsync(url, file, {
    idempotent: true,
    headers,
  });

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

async function downloadPdfFromApi(
  slug: DocumentSlug,
  aggregateId: string,
  filename: string,
  options?: { aggregateType?: DocumentAggregateType },
): Promise<File> {
  const headers = await getAuthHeaders();
  const path = buildDocumentPdfPath(slug, aggregateId, options);
  const url = `${getPublicApiBaseUrl()}${path}`;

  try {
    return await downloadRemotePdf(url, filename, headers);
  } catch (error) {
    throw new Error(mapDocumentError(error, 'Не удалось получить PDF'));
  }
}

async function ensurePdfFile(
  slug: DocumentSlug,
  orderId: string,
  orderNumber?: string,
  cachedDownloadUrl?: string,
): Promise<File> {
  const filename = buildDocumentFilename(slug, orderId, orderNumber);
  const cachedUrl = cachedDownloadUrl?.trim();

  if (cachedUrl) {
    try {
      return await downloadRemotePdf(cachedUrl, filename);
    } catch {
      // Fall back to API redirect/stream path.
    }
  }

  return downloadPdfFromApi(slug, orderId, filename);
}

async function ensureWarrantyPdfFile(
  slug: DocumentSlug,
  warrantyId: string,
  serialCode?: string,
  cachedDownloadUrl?: string,
): Promise<File> {
  const filename = buildDocumentFilename(slug, serialCode ?? warrantyId);
  const options = { aggregateType: 'warranty' as const };
  const cachedUrl = cachedDownloadUrl?.trim();

  if (cachedUrl) {
    try {
      return await downloadRemotePdf(cachedUrl, filename);
    } catch {
      // Fall back to API.
    }
  }

  try {
    return await downloadPdfFromApi(slug, warrantyId, filename, options);
  } catch {
    const bytes = await fetchDocumentPdf(slug, warrantyId, options);
    return writePdfCacheFile(filename, bytes);
  }
}

export async function shareWorkOrderDocument(
  slug: DocumentSlug,
  orderId: string,
  orderNumber?: string,
  cachedDownloadUrl?: string,
): Promise<void> {
  const file = await ensurePdfFile(slug, orderId, orderNumber, cachedDownloadUrl);
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
  cachedDownloadUrl?: string,
): Promise<void> {
  const file = await ensurePdfFile(slug, orderId, orderNumber, cachedDownloadUrl);
  await Print.printAsync({ uri: file.uri });
}

export async function shareWarrantyDocument(
  slug: DocumentSlug,
  warrantyId: string,
  serialCode?: string,
  cachedDownloadUrl?: string,
): Promise<void> {
  const file = await ensureWarrantyPdfFile(slug, warrantyId, serialCode, cachedDownloadUrl);
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
  cachedDownloadUrl?: string,
): Promise<void> {
  const file = await ensureWarrantyPdfFile(slug, warrantyId, serialCode, cachedDownloadUrl);
  await Print.printAsync({ uri: file.uri });
}
