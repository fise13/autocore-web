/**
 * Count + byte progress for one intake job's outbox photos.
 * Pure so the bay row and tests share the same numbers.
 */

import { isIntakePhotoConflict } from './count-visible-intake-photos';
import {
  aggregateUploadProgress,
  pickUploadProgress,
  type UploadProgressMap,
} from './upload-progress';

export type JobPhotoSyncCounts = {
  pending: number;
  uploading: number;
  failed: number;
  completed: number;
};

export type JobPhotoSyncBar = {
  ratio: number;
  label: string;
};

/** Company-wide wave the Island reads — same arithmetic as the in-app bar. */
export type CompanyPhotoSyncQueue = {
  done: number;
  total: number;
  pending: number;
  blocked: number;
  uploading: number;
  uploadRatio: number | null;
};

type CountableOutboxPhoto = {
  id: string;
  jobId: string;
  companyId: string;
  status: string;
  lastError?: string | null;
  errorInfo?: { code?: string } | null;
};

export function countJobOutboxPhotos(
  photos: readonly CountableOutboxPhoto[],
): JobPhotoSyncCounts {
  const counts: JobPhotoSyncCounts = {
    pending: 0,
    uploading: 0,
    failed: 0,
    completed: 0,
  };
  for (const photo of photos) {
    if (isIntakePhotoConflict(photo)) continue;
    if (photo.status === 'uploading') counts.uploading += 1;
    else if (photo.status === 'failed') counts.failed += 1;
    else if (photo.status === 'completed') counts.completed += 1;
    else counts.pending += 1;
  }
  return counts;
}

export function jobPhotoSyncProgress(input: {
  counts: JobPhotoSyncCounts;
  byteRatio: number | null;
}): JobPhotoSyncBar | null {
  const { pending, uploading, failed, completed } = input.counts;
  const total = pending + uploading + failed + completed;
  if (total <= 0) return null;
  if (failed > 0 && pending === 0 && uploading === 0 && completed === 0) {
    return {
      ratio: 0,
      label: failed === 1 ? '1 photo failed' : `${failed} photos failed`,
    };
  }

  const uploadingWeight =
    uploading > 0 && input.byteRatio != null ? uploading * input.byteRatio : 0;
  const done = completed + uploadingWeight;
  const ratio = Math.max(0, Math.min(1, done / total));
  const remaining = pending + uploading;
  if (remaining <= 0 && failed === 0) return null;
  const label =
    failed > 0
      ? `${completed}/${total} uploaded · ${failed} failed`
      : `${completed}/${total} uploaded`;
  return { ratio, label };
}

/**
 * Per-job upload bars for the bay. Completes locally as Storage PUTs land;
 * Firestore download URLs arrive later via prepare → finalize, not client
 * `arrayUnion`.
 */
export function jobPhotoSyncByJobId(input: {
  photos: readonly CountableOutboxPhoto[];
  companyId: string;
  byteProgress: UploadProgressMap;
}): ReadonlyMap<string, JobPhotoSyncBar> {
  const grouped = new Map<string, CountableOutboxPhoto[]>();
  for (const photo of input.photos) {
    if (photo.companyId !== input.companyId) continue;
    const list = grouped.get(photo.jobId);
    if (list) list.push(photo);
    else grouped.set(photo.jobId, [photo]);
  }

  const result = new Map<string, JobPhotoSyncBar>();
  for (const [jobId, jobPhotos] of grouped) {
    const counts = countJobOutboxPhotos(jobPhotos);
    const uploadingIds = jobPhotos
      .filter((photo) => photo.status === 'uploading' && !isIntakePhotoConflict(photo))
      .map((photo) => photo.id);
    const byteRatio = aggregateUploadProgress(
      pickUploadProgress(input.byteProgress, uploadingIds),
    ).ratio;
    const bar = jobPhotoSyncProgress({ counts, byteRatio });
    if (bar) result.set(jobId, bar);
  }
  return result;
}

/**
 * Wave the Dynamic Island should show.
 *
 * `sessionTotal` is the frozen denominator for this shutter wave. `done` is
 * whatever has already left the pending set — `syncedCount`, completed rows
 * still in the outbox, or `sessionTotal - pending - blocked` when a settle
 * dropped the row and `syncedCount` was wiped. Without that last term the
 * Island counted remaining files (`0/3` → `0/2` → `0/1`) instead of `1/3`.
 * Live bytes on `uploading` rows still move the bar the same way the Engines
 * row does.
 */
export function companyPhotoSyncQueue(input: {
  photos: readonly CountableOutboxPhoto[];
  syncedCount: number;
  sessionTotal: number;
  photoPendingCount: number;
  photoFailedCount: number;
  byteProgress: UploadProgressMap;
}): CompanyPhotoSyncQueue {
  const counts = countJobOutboxPhotos(input.photos);
  const uploadingIds = input.photos
    .filter((photo) => photo.status === 'uploading' && !isIntakePhotoConflict(photo))
    .map((photo) => photo.id);
  const uploadRatio = aggregateUploadProgress(
    pickUploadProgress(input.byteProgress, uploadingIds),
  ).ratio;
  const pending = Math.max(0, Math.floor(input.photoPendingCount));
  const blocked = Math.max(0, Math.floor(input.photoFailedCount));
  const settled = Math.max(0, Math.floor(input.syncedCount), counts.completed);
  const stickyTotal = Math.max(
    0,
    Math.floor(input.sessionTotal),
    settled + pending + blocked,
  );
  const impliedDone = Math.max(0, stickyTotal - pending - blocked);
  const done = Math.max(settled, impliedDone);
  return {
    done,
    total: stickyTotal,
    pending,
    blocked,
    uploading: counts.uploading,
    uploadRatio,
  };
}
