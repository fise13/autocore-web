import { createLocalFileFormData } from '@/lib/network/mobile-form-data';
import { mobileApi } from '@/services/api/endpoints';
import { mobileGet, mobileUpload } from '@/services/api/mobile-client';

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

export type DocumentImportJobStatus = {
  id: string;
  status: 'pending' | 'ready' | 'imported' | 'failed';
  previewDownloadUrl: string | null;
  originalDownloadUrl: string;
  width?: number;
  height?: number;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function uploadDocumentImport(
  uri: string,
  options?: {
    batchId?: string;
    onProgress?: (ratio: number) => void;
  },
): Promise<DocumentImportUploadResult> {
  const form = createLocalFileFormData('image', uri);
  if (options?.batchId) {
    form.append('batchId', options.batchId);
  }
  return mobileUpload<DocumentImportUploadResult>(mobileApi.documentImports, form, {
    onProgress: options?.onProgress,
  });
}

export async function uploadDocumentImportWithRetry(
  uri: string,
  options?: {
    batchId?: string;
    onProgress?: (ratio: number) => void;
    retries?: number;
  },
): Promise<DocumentImportUploadResult> {
  const retries = options?.retries ?? 2;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await uploadDocumentImport(uri, {
        batchId: options?.batchId,
        onProgress: options?.onProgress,
      });
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Не удалось отправить');
}

export async function getDocumentImportStatus(id: string): Promise<DocumentImportJobStatus> {
  return mobileGet<DocumentImportJobStatus>(mobileApi.documentImport(id));
}

export async function pollDocumentImportUntilSettled(
  id: string,
  options?: { attempts?: number; intervalMs?: number },
): Promise<DocumentImportJobStatus | null> {
  const attempts = options?.attempts ?? 10;
  const intervalMs = options?.intervalMs ?? 1400;

  for (let i = 0; i < attempts; i++) {
    try {
      const job = await getDocumentImportStatus(id);
      if (job.status === 'ready' || job.status === 'imported' || job.status === 'failed') {
        return job;
      }
    } catch {
      // Job may briefly 404 while dual-write settles.
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
