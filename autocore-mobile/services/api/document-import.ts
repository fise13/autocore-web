import { createLocalFileFormData } from '@/lib/network/mobile-form-data';
import { mobileApi } from '@/services/api/endpoints';
import { mobileUpload } from '@/services/api/mobile-client';

export type DocumentImportUploadResult = {
  id: string;
  batchId?: string;
  status: 'pending' | 'ready' | 'imported' | 'failed' | 'uploading' | 'processing' | 'extracted';
  previewDownloadUrl: string | null;
  originalDownloadUrl: string;
  width?: number;
  height?: number;
  createdAt: string;
};

export async function uploadDocumentImport(
  uri: string,
  options?: { batchId?: string },
): Promise<DocumentImportUploadResult> {
  const form = createLocalFileFormData('image', uri);
  if (options?.batchId) {
    form.append('batchId', options.batchId);
  }
  return mobileUpload<DocumentImportUploadResult>(mobileApi.documentImports, form);
}
