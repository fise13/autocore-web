import { useSyncExternalStore } from 'react';

import {
  aggregateUploadProgress,
  shouldNotifyProgress,
  type UploadProgressMap,
} from '../lib/upload-progress';

/**
 * In-memory byte progress for the photos currently on the wire.
 *
 * Never persisted and never restored: see `lib/upload-progress.ts` for why.
 * The persistent outbox remains the single owner of upload *status*; this is a
 * live overlay the UI may read, and losing it costs nothing.
 */
let progress: UploadProgressMap = {};
let snapshot: UploadProgressMap = progress;
const listeners = new Set<() => void>();
const lastNotifiedAt = new Map<string, number>();

function notify(): void {
  snapshot = progress;
  for (const listener of listeners) listener();
}

export function setIntakeUploadProgress(
  photoId: string,
  entry: { bytesSent: number; totalBytes: number },
  now = Date.now(),
): void {
  progress = { ...progress, [photoId]: entry };
  if (
    !shouldNotifyProgress({
      lastNotifiedAt: lastNotifiedAt.get(photoId) ?? null,
      now,
      bytesSent: entry.bytesSent,
      totalBytes: entry.totalBytes,
    })
  ) {
    return;
  }
  lastNotifiedAt.set(photoId, now);
  notify();
}

/** Drop a photo's live bytes once its transfer settles, either way. */
export function clearIntakeUploadProgress(photoId: string): void {
  if (!(photoId in progress)) return;
  const next = { ...progress };
  delete next[photoId];
  progress = next;
  lastNotifiedAt.delete(photoId);
  notify();
}

export function getIntakeUploadProgress(): UploadProgressMap {
  return snapshot;
}

export function subscribeIntakeUploadProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test seam — the module holds process-wide state. */
export function resetIntakeUploadProgress(): void {
  progress = {};
  lastNotifiedAt.clear();
  notify();
}

/**
 * Aggregate bytes for the sync UI. `ratio` is null when no transfer reports a
 * usable total, and the caller should fall back to counting photos.
 */
export function useIntakeUploadProgress(): {
  bytesSent: number;
  totalBytes: number;
  ratio: number | null;
} {
  const map = useSyncExternalStore(
    subscribeIntakeUploadProgress,
    getIntakeUploadProgress,
    getIntakeUploadProgress,
  );
  return aggregateUploadProgress(map);
}
