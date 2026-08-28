/**
 * Upload error classification.
 *
 * The outbox used to decide retryability by substring-matching humanised
 * English ("permission", "unauthor", /http 4\d\d/) and then *deleted the local
 * photo* for anything that matched. An expired token therefore destroyed the
 * file. Classification now happens once, on a code, and the code carries an
 * explicit `retryable` flag; deletion is never driven by it.
 *
 * The substring lists below are a *fast path*, never the decision. iOS hands
 * back NSURL errors in the phone's own language — a Russian handset says
 * "Сервер с указанным именем хоста не удалось найти" where an English one says
 * "A server with the specified hostname could not be found" — and a yard worker
 * saw four red "failed" photos purely because nobody had added that phrase to a
 * list. The rule that actually decides is structural and needs no dictionary:
 * **an error that carries no HTTP status never reached the server, so it is
 * transport.** New phrases, new locales and new iOS releases fall into that
 * bucket automatically.
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
  /** Transient precondition — resume / wait for photos, then retry. */
  'PRECONDITION',
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
  /**
   * The untouched error text, kept for diagnostics only.
   *
   * `message` is what a person may read, and for a transport failure that is
   * deliberately a calm sentence rather than the truth of the moment. Without
   * this field the actual cause — a DNS miss, a torn TLS handshake — was gone
   * the instant it was classified, which is exactly what made the localized
   * NSURL bug so slow to find.
   */
  raw?: string;
  timestamp: string;
};

/** Anything with a `status` and/or `message` — avoids importing MobileApiError. */
export type ErrorLike = {
  status?: number;
  message?: string;
  name?: string;
  code?: string | number;
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
  // Duplicate finalize / idempotency — retry until the server confirms the photo.
  CONFLICT: true,
  // Session paused / Finish-before-photos — drain resume + photo order will clear it.
  PRECONDITION: true,
  FILE_MISSING: false,
  DEPLOY_REQUIRED: false,
  // Unclassifiable *and* statusless is transport (see `classifySyncError`), so
  // what is left here genuinely came back from a server that did not like the
  // request. Another identical attempt will not change its mind.
  UNKNOWN: false,
};

/**
 * Failures the person is expected to see and act on.
 *
 * Everything else is AutoCore's problem, not the yard's. A dismantler works
 * where the signal dies between two containers; telling them the radio is down
 * is noise they can do nothing about, and after the third red card they stop
 * reading all of them — including the one that mattered.
 *
 * So the rule is narrow: surface a failure only when a person can act on it
 * *now*, on this phone. Photos are never lost either way — the queue keeps
 * them and keeps trying.
 */
const NEEDS_PERSON: Record<SyncErrorCode, boolean> = {
  NETWORK_UNAVAILABLE: false,
  TIMEOUT: false,
  SERVER_5XX: false,
  RATE_LIMIT: false,
  CONFLICT: false,
  PRECONDITION: false,
  NOT_FOUND: false,
  UNKNOWN: false,
  // Sign in again — the only fix is on this phone, by this person.
  AUTH_EXPIRED: true,
  // A wrong role: they need to ask, and no retry will help.
  PERMISSION_DENIED: true,
  // The bytes are gone; only a new shot brings the angle back.
  FILE_MISSING: true,
  FILE_TOO_LARGE: true,
  // An operator problem, but it is silent otherwise and blocks the whole yard.
  DEPLOY_REQUIRED: true,
  INVALID_REQUEST: true,
};

/**
 * What the person reads, on the rare occasion they read anything.
 *
 * No message here says "sync". The yard's model is simply: the photo is on the
 * phone, and AutoCore puts it where it belongs. Naming the machinery invites
 * them to manage it, and there is nothing for them to manage.
 */
const USER_MESSAGE: Record<SyncErrorCode, string> = {
  NETWORK_UNAVAILABLE: 'Saved on this phone. It uploads by itself once there is signal.',
  TIMEOUT: 'Saved on this phone. It uploads by itself once there is signal.',
  SERVER_5XX: 'Saved on this phone. It uploads by itself in a moment.',
  RATE_LIMIT: 'Saved on this phone. It uploads by itself in a moment.',
  AUTH_EXPIRED: 'Sign in again to keep going. Your photos stay on this phone.',
  PERMISSION_DENIED: 'Your role cannot add engine photos.',
  INVALID_REQUEST: 'The server would not take this photo. Support can see why.',
  FILE_TOO_LARGE: 'This photo is too large to upload.',
  NOT_FOUND: 'This engine is no longer on the server.',
  CONFLICT: 'This photo is already on the server.',
  PRECONDITION: 'Saved on this phone. It uploads by itself in a moment.',
  FILE_MISSING: 'That photo is gone from this phone. Shoot the angle again.',
  DEPLOY_REQUIRED: 'The server is missing the upload API. Ask your admin to deploy it.',
  UNKNOWN: 'Saved on this phone. It uploads by itself in a moment.',
};

export function isRetryableSyncError(code: SyncErrorCode): boolean {
  return RETRYABLE[code];
}

/**
 * Whether this failure is worth putting in front of the worker at all.
 *
 * Drives every failure surface: the camera card, the Engines banner, the OS
 * notification. `false` means the queue handles it silently.
 */
export function syncErrorNeedsPerson(code: SyncErrorCode): boolean {
  return NEEDS_PERSON[code];
}

/**
 * A failure caused by the link, not by the request.
 *
 * These must never reach a terminal state: a photo that cannot be sent today
 * is sent tomorrow, and a bay with no signal is the normal working condition
 * here rather than an incident.
 */
export function isTransportSyncError(code: SyncErrorCode): boolean {
  return (
    code === 'NETWORK_UNAVAILABLE' ||
    code === 'TIMEOUT' ||
    code === 'SERVER_5XX' ||
    code === 'RATE_LIMIT'
  );
}

/**
 * Only treat a 409 as "already on the server" when the body says so.
 *
 * Engine intake defaults many failures to HTTP 409 (claim gone, prepare
 * mismatch, ownership). Treating every 409 as success used to delete the
 * local file while the server still had zero synced photos — Finish then
 * failed and the camera looked empty.
 */
export function isIdempotentPhotoSuccess(error: unknown): boolean {
  if (classifySyncError(error) !== 'CONFLICT') return false;
  const text = String((error as ErrorLike).message ?? '').toLowerCase();
  if (isPreconditionMessage(text)) return false;
  return (
    text.includes('already recorded') ||
    text.includes('already on the server') ||
    text.includes('already uploaded')
  );
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

/** Finish that lands after the job is already Ready is success, not a retry loop. */
export function isBenignFieldCompleteError(error: unknown): boolean {
  const text = String((error as ErrorLike).message ?? '').toLowerCase();
  return (
    text.includes('cannot transition from awaiting_verification') ||
    text.includes('cannot transition from completed')
  );
}

export function syncErrorMessage(code: SyncErrorCode): string {
  return USER_MESSAGE[code];
}

/** Every sentence this module can produce — lets callers recognise their own copy. */
export const SYNC_ERROR_MESSAGES: ReadonlySet<string> = new Set(Object.values(USER_MESSAGE));

/**
 * `fetch` rejects with a bare TypeError when the radio is off *or* when iOS
 * tears the request down as the app leaves. RN prefixes that as
 * `fetch failed: <localized NSURL error>` — on a Russian phone the body is
 * "Сетевое соединение потеряно", which never contained the English words we
 * used to look for, so the photo was marked FAILED.
 */
function looksOffline(text: string): boolean {
  return (
    text.includes('fetch failed') ||
    text.includes('failed to fetch') ||
    text.includes('network request failed') ||
    text.includes('the internet connection appears to be offline') ||
    text.includes('the network connection was lost') ||
    text.includes('connection was lost') ||
    text.includes('connection lost') ||
    // NSURLErrorCannotFindHost — a DNS miss on a yard Wi-Fi that has an IP
    // lease but no working resolver. This is what a phone shows when it is
    // "connected" to a router that is itself offline, which is the single most
    // common shape of bad signal in a dismantling yard.
    text.includes('could not be found') ||
    text.includes('cannot find host') ||
    text.includes('hostname could not be found') ||
    // Russian NSURL strings, verbatim from iOS.
    text.includes('соединение потерян') ||
    text.includes('сетевое соединение') ||
    text.includes('нет подключ') ||
    text.includes('соединение с интернетом') ||
    text.includes('не удалось найти') ||
    text.includes('именем хоста') ||
    text.includes('сервер не найден') ||
    text.includes('превышено время ожидания') ||
    text.includes('offline') ||
    text.includes('econnrefused') ||
    text.includes('enotfound') ||
    text.includes('eai_again') ||
    text.includes('software caused connection abort') ||
    text.includes('nsurlerror')
  );
}

/**
 * An HTTP status the error actually carries, including one only spelled out in
 * the message.
 *
 * The Storage PUT is raised by hand as `Photo upload failed (HTTP 503)` with no
 * `status` field, so without this a perfectly ordinary 5xx from the bucket fell
 * through to the statusless branch. That is now the transport branch, which
 * would have been the right *outcome* by luck — but for the wrong reason, and
 * it would have hidden a real 4xx from the bucket the same way.
 */
function httpStatusOf(candidate: ErrorLike): number | null {
  if (typeof candidate.status === 'number' && Number.isFinite(candidate.status)) {
    return candidate.status;
  }
  const match = /\bhttp[\s:]*(\d{3})\b/i.exec(String(candidate.message ?? ''));
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * NSURL error domain codes that mean "the link, not the request".
 *
 * -1001 timed out · -1003 cannot find host · -1004 cannot connect to host
 * -1005 connection lost · -1009 not connected · -1200 / -1202 TLS failure
 * -997 lost connection to background transfer service · -999 cancelled
 */
const OFFLINE_NSURL_CODES = new Set([
  -1001, -1003, -1004, -1005, -1009, -1200, -1202, -997, -999,
]);

function errorCodeLooksOffline(code: string | number | undefined): boolean {
  if (code == null || code === '') return false;
  const numeric = Number(code);
  if (Number.isFinite(numeric) && OFFLINE_NSURL_CODES.has(numeric)) return true;
  const text = String(code).toLowerCase();
  return text.includes('network') || text === 'unavailable';
}

/**
 * iOS tears down in-flight JS fetch / URLSession callbacks the instant the
 * app leaves the foreground. Those messages look like "offline" but the
 * radios are still up — Live Activity + the background session own the PUT.
 */
export function isAppLifecycleTransportError(error: unknown): boolean {
  const candidate = (error ?? {}) as ErrorLike;
  const text = String(candidate.message ?? '').toLowerCase();
  if (errorCodeLooksOffline(candidate.code) && Number(candidate.code) === -1005) return true;
  if (errorCodeLooksOffline(candidate.code) && Number(candidate.code) === -999) return true;
  if (!text) return false;
  if (text.includes('already cancelled') || text.includes('cannot transition from cancelled')) {
    return false;
  }
  return (
    text.includes('fetch failed') ||
    text.includes('network connection was lost') ||
    text.includes('connection was lost') ||
    text.includes('connection lost') ||
    text.includes('соединение потерян') ||
    text.includes('сетевое соединение') ||
    text.includes('software caused connection abort') ||
    text.includes('upload was cancelled') ||
    text.includes('upload was canceled') ||
    text.includes('the operation was aborted') ||
    text.includes('cancelled') ||
    text.includes('canceled') ||
    text.includes('aborted') ||
    text.includes('nsurlerrorcancelled') ||
    text.includes('nsurlerrornetworkconnectionlost')
  );
}

/**
 * Leaving the app is not a radio-down. Requeue the row as `queued` instead of
 * parking `waiting_for_network` (which painted "Waiting for connection" on
 * the Island) or burning an attempt.
 *
 * iOS often tears the JS `fetch` down *before* `AppState` leaves `active`,
 * so a connection-lost TypeError while the person is still "in" the app is
 * still a leave-app abort — not a real outage.
 */
export function shouldRequeueAfterAppLeave(input: {
  appState: string;
  error: unknown;
}): boolean {
  if (isAppLifecycleTransportError(input.error)) return true;
  if (input.appState === 'active') return false;
  const code = classifySyncError(input.error);
  return code === 'NETWORK_UNAVAILABLE' || code === 'TIMEOUT';
}

/** A torn-down fetch / timeout — retry, do not mark the photo failed. */
export function isTransientTransportFailure(error: unknown): boolean {
  if (isAppLifecycleTransportError(error)) return true;
  const code = classifySyncError(error);
  return code === 'NETWORK_UNAVAILABLE' || code === 'TIMEOUT';
}

/**
 * Rows already persisted as `failed` from a leave-app TypeError (especially
 * localized `fetch failed: …`) must go back on the queue. A dead file or a
 * 4xx stays failed.
 */
export function shouldReviveFailedSyncRow(input: {
  status: string;
  errorInfo?: { code?: SyncErrorCode; message?: string } | null;
  lastError?: string | null;
}): boolean {
  if (input.status !== 'failed') return false;
  const stored = input.errorInfo?.code;
  if (stored) {
    // Anything the person cannot fix stays parked exactly as it is; every other
    // dead row goes back on the queue.
    //
    // The breadth here is deliberate. Rows persist across app updates, so a row
    // killed by a *server* bug — an endpoint that rejected a perfectly good
    // photo — would otherwise stay dead on that phone forever, even after the
    // fix shipped. Photos already on people's phones are the whole point of the
    // queue; giving them one more attempt after every launch costs a request
    // and can only ever recover work.
    return !syncErrorNeedsPerson(stored);
  }
  return isTransientTransportFailure({
    message: input.lastError ?? input.errorInfo?.message,
  });
}

function isPreconditionMessage(text: string): boolean {
  return (
    text.includes('resume the session') ||
    text.includes('before taking photos') ||
    text.includes('before completing field work') ||
    text.includes('finish needs a serial') ||
    text.includes('at least one photo') ||
    text.includes('session claim is no longer active') ||
    text.includes('engine intake session was not found') ||
    text.includes('job is not in an active intake session')
  );
}

function isEmptyOrMissingFile(text: string): boolean {
  return (
    text.includes('local photo is missing') ||
    text.includes('no longer available') ||
    text.includes('captured photo is empty') ||
    text.includes('photo is empty') ||
    text.includes('retake this angle') ||
    (text.includes('empty') && text.includes('photo'))
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
  const status = httpStatusOf(candidate);

  // Message wins for cases a status cannot express.
  if (looksOffline(text) || errorCodeLooksOffline(candidate.code)) return 'NETWORK_UNAVAILABLE';
  if (status === 0) return 'NETWORK_UNAVAILABLE';
  if (isAppLifecycleTransportError(error)) return 'TIMEOUT';
  if (
    text.includes('web app needs to be deployed') ||
    text.includes('upload api is missing') ||
    text.includes('api not found') ||
    text.includes('returned html instead of json')
  ) {
    return 'DEPLOY_REQUIRED';
  }
  // A malformed body is a *server answer*, not a dead link — it just happens to
  // be raised without a status. Letting it fall through to the transport branch
  // would retry it forever at the ceiling interval.
  if (text.includes('returned an invalid response')) return 'INVALID_REQUEST';
  if (isEmptyOrMissingFile(text)) return 'FILE_MISSING';
  if (text.includes('too large') || text.includes('25 mb')) return 'FILE_TOO_LARGE';
  if (
    text.includes('only jpeg') ||
    text.includes('heic') ||
    text.includes('content type') ||
    text.includes('unsupported')
  ) {
    // Unsupported type is a client payload problem — not worth retrying.
    if (text.includes('only jpeg') || text.includes('unsupported')) return 'INVALID_REQUEST';
  }
  if (isPreconditionMessage(text)) return 'PRECONDITION';
  if (text.includes('timeout') || text.includes('timed out') || text.includes('aborted')) {
    return 'TIMEOUT';
  }

  if (status != null) {
    // 409 body often means "already recorded" — but pause/finish preconditions
    // also use 409. Message check above already caught those.
    return codeFromStatus(status);
  }

  // No status means no server ever answered — the request died in the radio,
  // the resolver, or the TLS handshake. Whatever iOS called it, and in whatever
  // language, it is transport, and transport is a pause rather than a failure.
  //
  // This is what makes the classifier locale-proof: the substring lists above
  // only exist to catch a *statusful* response that still describes a network
  // problem. Anything they miss lands here and is retried, instead of turning
  // into a red card the worker cannot act on.
  return 'NETWORK_UNAVAILABLE';
}

/**
 * The raw text, trimmed to something a log can hold. Never rendered.
 *
 * Kept apart from `message` on purpose: the previous version handed the raw
 * string straight to the camera for `INVALID_REQUEST`, which is how a worker
 * standing over an engine ended up reading "Invalid intake photo finalization"
 * — a zod validation label from an API route, in a language the yard does not
 * speak, about a photo that was already safely on the server.
 */
function diagnosticText(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > 240 ? `${trimmed.slice(0, 237)}…` : trimmed;
}

/**
 * Full record — the one sentence a person may read, plus everything a
 * developer needs, kept strictly apart.
 *
 * `message` is always the canned copy for the code. Server prose is written for
 * whoever wrote the endpoint, and it leaks internals, English, and HTTP
 * vocabulary into a camera screen held in a glove.
 */
export function describeSyncError(error: unknown, now = new Date()): SyncErrorInfo {
  const code = classifySyncError(error);
  const candidate = (error ?? {}) as ErrorLike;
  const raw = diagnosticText(candidate.message);
  const status = httpStatusOf(candidate);
  return {
    code,
    message: syncErrorMessage(code),
    retryable: isRetryableSyncError(code),
    ...(status != null ? { status } : {}),
    ...(raw ? { raw } : {}),
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
