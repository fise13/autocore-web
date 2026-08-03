import { uploadDocumentImportWithRetry } from '@/services/api/document-import';
import { rememberRecentScan } from '@/lib/scan/recent-scans';

export type ScanDocumentUploadResult = {
  jobId: string;
  batchId?: string;
};

/**
 * Document-mode import — same upload pipeline as the standalone Import screen.
 * Does not block on parse polling (that was freezing the scan UI after shutter).
 */
export async function uploadScanDocument(
  uri: string,
  options?: {
    batchId?: string;
    onProgress?: (ratio: number) => void;
  },
): Promise<ScanDocumentUploadResult> {
  const result = await uploadDocumentImportWithRetry(uri, {
    batchId: options?.batchId,
    onProgress: options?.onProgress,
    retries: 2,
  });

  void rememberRecentScan({
    payload: `document:${result.id}`,
    label: 'Document import',
    itemId: result.id,
  });

  return {
    jobId: result.id,
    batchId: result.batchId,
  };
}
