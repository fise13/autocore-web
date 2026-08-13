/**
 * Sync error classification.
 *
 * The outbox used to decide retryability by substring-matching humanised
 * English ("permission", "unauthor", /http 4\d\d/) and then *deleted the local
 * photo* for anything that matched. An expired token therefore destroyed the
 * file. Classification now happens once, on a code, and the code carries an
 * explicit `retryable` flag; deletion is never driven by it.
 *
 * Pure — no React, no network, no `MobileApiError` import (that module pulls in
 * React Native and cannot load under the node test runner). Callers pass a
 * duck-typed error instead.
 */

export const SYNC_ERROR_CODES = [
  /** Device has no usable network. Not a failure — a pause. */
  'NETWORK_UNAVAILABLE',
  'TIMEOUT',
  'SERVER_5XX',
  'RATE_LIMIT',
  'AUTH_EXPIRED',
  'PERMISSION_DENIED',
  'INVALID_REQUEST',
  'FILE_TOO_LARGE',
  'NOT_FOUND',
  'CONFLICT',
  /** The captured file is gone from disk — retrying cannot bring it back. */
  'FILE_MISSING',
  /** Server is reachable but the upload API is not deployed. */
  'DEPLOY_REQUIRED',
  'UNKNOWN',
] as const;

export type SyncErrorCode = (typeof SYNC_ERROR_CODES)[number];

export type SyncErrorInfo = {
  code: SyncErrorCode;
  /** Human-readable, safe to show. Never a stack trace. */
  message: string;
  retryable: boolean;
  /** HTTP status when the failure came from a response. */
  status?: number;
  timestamp: string;
};

/** Anything with a `status` and/or `message` — avoids importing MobileApiError. */
export type ErrorLike = {
  status?: number;
  message?: string;
  name?: string;
};

const RETRYABLE: Record<SyncErrorCode, boolean> = {
  NETWORK_UNAVAILABLE: true,
  TIMEOUT: true,
  SERVER_5XX: true,
  RATE_LIMIT: true,
  // Recoverable by the person, not by another attempt — but the photo is kept.
  AUTH_EXPIRED: false,
  PERMISSION_DENIED: false,
  INVALID_REQUEST: false,
  FILE_TOO_LARGE: false,
  NOT_FOUND: false,
  // Duplicate finalize / idempotency — retry until the server confirms synced.
  CONFLICT: true,
  FILE_MISSING: false,
  DEPLOY_REQUIRED: false,
  UNKNOWN: false,
};

/**
 * What the person reads. Every retryable message says the photo is safe,
 * because the single thing they care about is whether the work is lost.
 */
const USER_MESSAGE: Record<SyncErrorCode, string> = {
  NETWORK_UNAVAILABLE: 'Saved on this iPhone. Will sync automatically when you are online.',
  TIMEOUT: 'The upload timed out. Photos are safe on this iPhone and will retry.',
  SERVER_5XX: 'Server temporarily unavailable. Photos are safe on this iPhone.',
  RATE_LIMIT: 'The server is busy. Photos are safe on this iPhone and will retry shortly.',
  AUTH_EXPIRED: 'Your session expired. Sign in again to continue syncing.',
  PERMISSION_DENIED: 'Your role cannot upload intake photos.',
  INVALID_REQUEST: 'The server rejected this upload. Support can see the details.',
  FILE_TOO_LARGE: 'This photo is too large to upload.',
  NOT_FOUND: 'This engine is no longer on the server.',
  CONFLICT: 'This photo is already on the server. Finishing sync.',
  FILE_MISSING: 'That photo file is gone from this iPhone. Shoot it again.',
  DEPLOY_REQUIRED: 'The upload API is missing on the server. Deploy the web app, then retry.',
  UNKNOWN: 'Upload could not be completed. Photos are safe on this iPhone.',
};

export function isRetryableSyncError(code: SyncErrorCode): boolean {
  return RETRYABLE[code];
}

/**
 * HTTP 409 on a photo means the server already has this capture (idempotency
 * key, a finished PUT, or a retried finalize). Showing it as "1 failed" is
 * wrong — the work is done. The local file may be deleted.
 */
export function isIdempotentPhotoSuccess(error: unknown): boolean {
  return classifySyncError(error) === 'CONFLICT';
}

/**
 * Cancelling a job that the server never created (offline overlay) or already
 * dropped is success — keep retrying it and the engine stays in the bay.
 */
export function isBenignCancelError(error: unknown): boolean {
  const code = classifySyncError(error);
  if (code === 'NOT_FOUND' || code === 'CONFLICT') return true;
  const text = String((error as ErrorLike).message ?? '').toLowerCase();
  return (
    text.includes('was not found') ||
    text.includes('already cancelled') ||
    text.includes('cannot transition from cancelled')
  );
}

export function syncErrorMessage(code: SyncErrorCode): string {
  return USER_MESSAGE[code];
}

/**
 * `fetch` rejects with a bare TypeError when the radio is off, so offline is
 * detected from the message rather than a status.
 */
function looksOffline(text: string): boolean {
  return (
    text.includes('network request failed') ||
    text.includes('failed to fetch') ||
    text.includes('the internet connection appears to be offline') ||
    text.includes('offline') ||
    text.includes('econnrefused') ||
    text.includes('enotfound') ||
    text.includes('software caused connection abort')
  );
}

function codeFromStatus(status: number): SyncErrorCode {
  if (status === 401) return 'AUTH_EXPIRED';
  if (status === 403) return 'PERMISSION_DENIED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 408) return 'TIMEOUT';
  if (status === 409) return 'CONFLICT';
  if (status === 410) return 'FILE_MISSING';
  if (status === 413) return 'FILE_TOO_LARGE';
  if (status === 429) return 'RATE_LIMIT';
  if (status >= 500) return 'SERVER_5XX';
  if (status >= 400) return 'INVALID_REQUEST';
  return 'UNKNOWN';
}

export function classifySyncError(error: unknown): SyncErrorCode {
  const candidate = (error ?? {}) as ErrorLike;
  const text = String(candidate.message ?? '').toLowerCase();

  // Message wins for the two cases a status cannot express.
  if (looksOffline(text)) return 'NETWORK_UNAVAILABLE';
  if (
    text.includes('web app needs to be deployed') ||
    text.includes('upload api is missing') ||
    text.includes('api not found') ||
    text.includes('returned html instead of json')
  ) {
    return 'DEPLOY_REQUIRED';
  }
  if (text.includes('local photo is missing') || text.includes('no longer available')) {
    return 'FILE_MISSING';
  }
  if (text.includes('timeout') || text.includes('timed out') || text.includes('aborted')) {
    return 'TIMEOUT';
  }

  if (typeof candidate.status === 'number' && Number.isFinite(candidate.status)) {
    return codeFromStatus(candidate.status);
  }

  return 'UNKNOWN';
}

/** Full record — user copy plus everything a developer needs in diagnostics. */
export function describeSyncError(error: unknown, now = new Date()): SyncErrorInfo {
  const code = classifySyncError(error);
  const candidate = (error ?? {}) as ErrorLike;
  return {
    code,
    message: syncErrorMessage(code),
    retryable: isRetryableSyncError(code),
    ...(typeof candidate.status === 'number' ? { status: candidate.status } : {}),
    timestamp: now.toISOString(),
  };
}

/**
 * Whether the local file may be removed. Deliberately narrow: only a confirmed
 * server-side success, or a file that is already gone, ever clears a photo.
 * A failure — any failure — leaves the bytes on the device.
 */
export function mayDeleteLocalFile(reason: 'uploaded' | 'file-missing'): boolean {
  return reason === 'uploaded' || reason === 'file-missing';
}
