import { mobileApi } from '@/services/api/endpoints';
import { mobileUpload } from '@/services/api/mobile-client';

export type DocumentImportUploadResult = {
  id: string;
  status: 'pending' | 'ready' | 'imported' | 'failed';
  previewDownloadUrl: string | null;
  originalDownloadUrl: string;
  width?: number;
  height?: number;
  createdAt: string;
};

export async function uploadDocumentImport(
  uri: string,
  filename = 'document.jpg',
  mimeType = 'image/jpeg',
): Promise<DocumentImportUploadResult> {
  const formData = new FormData();
  formData.append('image', {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  return mobileUpload<DocumentImportUploadResult>(mobileApi.documentImports, formData);
}
