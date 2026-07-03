import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildDocumentFilename, fetchWorkOrderDocumentPdf } from '@/services/api/document-pdf';
import type { DocumentSlug } from '@/types/document';

async function ensurePdfFile(
  slug: DocumentSlug,
  orderId: string,
  orderNumber?: string,
): Promise<File> {
  const bytes = await fetchWorkOrderDocumentPdf(slug, orderId);
  const filename = buildDocumentFilename(slug, orderId, orderNumber);
  const file = new File(Paths.cache, filename);

  const writer = file.writableStream().getWriter();
  await writer.write(new Uint8Array(bytes));
  await writer.close();

  return file;
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
  const bytes = await fetchWorkOrderDocumentPdf(slug, orderId);
  const filename = buildDocumentFilename(slug, orderId, orderNumber);
  const file = new File(Paths.document, filename);

  const writer = file.writableStream().getWriter();
  await writer.write(new Uint8Array(bytes));
  await writer.close();

  return file.uri;
}
