/**
 * Live byte progress for in-flight photo uploads.
 *
 * Deliberately separate from the persistent outbox. Progress is the one piece
 * of upload state that must *not* be persisted: it describes bytes moving
 * right now, it changes ~10x a second per task, and after a relaunch it is
 * meaningless — the background URLSession may have carried the transfer to
 * completion while no JS was running. Writing it through `publish()` would put
 * an MMKV write and a full React notification on every tick of every parallel
 * upload.
 *
 * So the queue stays the owner of *status* (queued / uploading / failed /
 * completed, persisted), and this is a throwaway overlay of *bytes* on top.
 *
 * Pure — no React Native — so the node test runner can load it.
 */

export type UploadProgressEntry = {
  bytesSent: number;
  totalBytes: number;
};

export type UploadProgressMap = Readonly<Record<string, UploadProgressEntry>>;

/**
 * Aggregate byte progress across the photos currently uploading.
 *
 * `ratio` is null when nothing reports a usable total — the UI then falls back
 * to counting photos, which is the only honest thing to show.
 */
export function pickUploadProgress(
  progress: UploadProgressMap,
  ids: readonly string[],
): UploadProgressMap {
  if (ids.length === 0) return {};
  const next: Record<string, UploadProgressEntry> = {};
  for (const id of ids) {
    const entry = progress[id];
    if (entry) next[id] = entry;
  }
  return next;
}

export function aggregateUploadProgress(progress: UploadProgressMap): {
  bytesSent: number;
  totalBytes: number;
  ratio: number | null;
} {
  let bytesSent = 0;
  let totalBytes = 0;
  for (const entry of Object.values(progress)) {
    if (!Number.isFinite(entry.totalBytes) || entry.totalBytes <= 0) continue;
    if (!Number.isFinite(entry.bytesSent) || entry.bytesSent < 0) continue;
    // A retried task can report more sent than expected; never let that push
    // the bar past 100%.
    bytesSent += Math.min(entry.bytesSent, entry.totalBytes);
    totalBytes += entry.totalBytes;
  }
  if (totalBytes <= 0) return { bytesSent: 0, totalBytes: 0, ratio: null };
  return { bytesSent, totalBytes, ratio: bytesSent / totalBytes };
}

/**
 * Smallest interval between progress notifications, per photo.
 *
 * The native side already throttles to 100ms per task; with four uploads in
 * flight that is still 40 React notifications a second for a bar that cannot
 * move visibly that fast.
 */
export const PROGRESS_NOTIFY_INTERVAL_MS = 250;

/** Whether this tick is worth waking the UI for. */
export function shouldNotifyProgress(input: {
  lastNotifiedAt: number | null;
  now: number;
  bytesSent: number;
  totalBytes: number;
}): boolean {
  // The final tick always lands, so a bar never freezes just short of full.
  if (input.totalBytes > 0 && input.bytesSent >= input.totalBytes) return true;
  if (input.lastNotifiedAt == null) return true;
  return input.now - input.lastNotifiedAt >= PROGRESS_NOTIFY_INTERVAL_MS;
}
