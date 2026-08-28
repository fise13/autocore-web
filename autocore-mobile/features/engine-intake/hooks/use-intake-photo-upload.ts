import { useMemo } from 'react';

import {
  jobPhotoSyncByJobId,
  type JobPhotoSyncBar,
} from '../lib/job-photo-sync-progress';
import { useIntakeUploadProgressMap } from '../store/intake-upload-progress';
import type { IntakeOutboxPhoto } from '../store/intake-outbox';

/**
 * Per-job photo upload bars for the Engine intake bay.
 *
 * Subscribe once at the list screen and pass `map.get(jobId)` into each row.
 * Byte ticks are throttled in the progress store; this only remaps them.
 */
export function useIntakePhotoUploadProgress(
  companyId: string | null | undefined,
  photos: readonly IntakeOutboxPhoto[],
): ReadonlyMap<string, JobPhotoSyncBar> {
  const byteProgress = useIntakeUploadProgressMap();
  return useMemo(
    () =>
      jobPhotoSyncByJobId({
        photos,
        companyId: companyId ?? '',
        byteProgress,
      }),
    [byteProgress, companyId, photos],
  );
}
