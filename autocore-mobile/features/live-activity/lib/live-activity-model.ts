/**
 * The Live Activity is a view of *how many intake photos have synced*.
 *
 * It is not a documenting session. An open camera with nothing in the outbox
 * is not news — a permanent Island is the fastest way to teach someone to
 * ignore it. The frame exists only while photos still need to leave this
 * phone, and it says one thing: `3/8`.
 *
 * `title` is a fixed noun for the surfaces that have room for one — the Lock
 * Screen banner and the expanded Island. A bare `3/8` sitting between a text
 * message and a calendar alert is not information; nothing on that screen says
 * what was counted. It is deliberately a label and never a status narration:
 * no "waiting", no "connection", no sentence about the queue.
 *
 * Offline is the same frame. Parked photos are not a failure; they are still
 * on the device and still count in the denominator. Do not paint
 * "Waiting for connection" and do not read NetInfo — iOS lies about that
 * the moment the process backgrounds.
 *
 * Person-needed failures (missing file, auth) are the only exception: a quiet
 * fail accent, still as `N/M`, never a paragraph about the queue.
 *
 * A finished wave is the other exception. The resolver itself goes idle — an
 * empty outbox is not a standing activity — and the pusher paints one Watch-
 * style success frame (green check, "Sync complete") from the last syncing
 * counts before it dismisses.
 *
 * JS freeze after leave can leave the last count stuck. That number was true
 * when the runtime last ran, which is the honest thing an Island can say.
 *
 * This module is pure and runs under the root Node test runner — relative
 * imports only, and nothing that pulls React Native.
 *
 * Accents, symbols and copy are resolved *here*: the widget function is
 * serialized on its own and cannot see module scope.
 */

/** One Live Activity — photos leaving the phone. */
export type LiveActivityMode = 'sync';

/** Counts from the intake outbox wave. All integers ≥ 0. */
export type LiveActivityQueue = {
  /** Photos confirmed on the server in this wave. */
  done: number;
  /** Wave size (synced + still pending). */
  total: number;
  /** Photos the queue is still working on (includes parked / no-signal). */
  pending: number;
  /** Failed photos that need the person (file missing, auth) — never transport. */
  blocked: number;
  /** Photos with bytes on the wire right now. */
  uploading: number;
  /** 0–1 across those uploads; null when native progress has no totals. */
  uploadRatio: number | null;
};

export type LiveActivityInput = {
  /** Signed-in company with intake permission. Otherwise never present anything. */
  enabled: boolean;
  queue?: LiveActivityQueue | null;
};

/**
 * Flat, JSON-safe props. These cross into the widget extension through App Group
 * storage, so every field is a primitive.
 *
 * Field names are the Live Activity contract — the widget body reads these
 * keys. Unused slots stay as their neutral values rather than disappearing.
 */
export type LiveActivityProps = {
  status: LiveActivityStatus;
  mode: LiveActivityMode;
  /** Two-word label next to the numeral. Names the subject, never the state. */
  title: string;
  detail: string;
  subject: string;
  /** Big numeral — synced/total. */
  headline: string;
  caption: string;
  symbol: LiveActivitySymbol;
  accent: string;
  done: number;
  total: number;
  /** 0–1. */
  progress: number;
  pending: number;
  blocked: number;
  /** Retained for the widget contract; this frame never counts down. */
  retryAtMs: number;
  determinate: boolean;
  /** file:// URI of the app icon inside widgetsDirectory. Empty when unavailable. */
  iconUri: string;
};

export type LiveActivityStatus = 'SYNCING' | 'FAILED' | 'SUCCEEDED';

export type DesiredLiveActivity =
  | { kind: 'idle' }
  | { kind: 'active'; props: LiveActivityProps };

/**
 * Deliberately a literal union rather than `string`: `Image systemName` is typed
 * against the SF Symbol catalogue, so a typo here is a compile error instead of
 * a silently blank glyph on someone's Lock Screen.
 */
export type LiveActivitySymbol =
  | 'arrow.triangle.2.circlepath'
  | 'exclamationmark.triangle.fill'
  | 'checkmark.circle.fill';

/**
 * Apple's system accents rather than the AutoCore brand palette: the Island sits
 * in the system's chrome, not in the app, and a brand blue reads as a bug there.
 */
const SYNC_ACCENT = '#0A84FF';
const FAIL_ACCENT = '#FF453A';
/** iOS system green — the Watch "sync complete" check lives in this, not brand. */
const SUCCESS_ACCENT = '#30D158';

/**
 * The whole vocabulary of this activity.
 *
 * `Engine photos` names what the numeral counts and nothing else — it stays
 * identical while the queue is parked offline, because a photo sitting on the
 * phone with no signal is still an engine photo and the count is still true.
 * The failure label borrows the app's existing "Needs you" phrasing, which is
 * the one case where a person has to do something.
 */
const SYNC_TITLE = 'Engine photos';
const FAIL_TITLE = 'Photos need you';
const SUCCESS_TITLE = 'Sync complete';

function clampCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

export function normalizeLiveActivityQueue(queue: LiveActivityQueue): {
  done: number;
  total: number;
  pending: number;
  blocked: number;
  uploading: number;
  uploadRatio: number | null;
} {
  const done = clampCount(queue.done);
  const pending = clampCount(queue.pending);
  const blocked = clampCount(queue.blocked);
  const uploading = clampCount(queue.uploading);
  const total = Math.max(clampCount(queue.total), done + pending + blocked);
  const rawRatio = queue.uploadRatio;
  const uploadRatio =
    rawRatio == null || !Number.isFinite(rawRatio)
      ? null
      : Math.max(0, Math.min(1, rawRatio));
  return { done, total, pending, blocked, uploading, uploadRatio };
}

function syncProgress(queue: ReturnType<typeof normalizeLiveActivityQueue>): number {
  const { done, total, uploading, uploadRatio } = queue;
  if (total <= 0) return 0;
  const uploadWeight = uploading > 0 && uploadRatio != null ? uploading * uploadRatio : 0;
  return Math.max(0, Math.min(1, (done + uploadWeight) / total));
}

function buildSyncLiveActivityProps(
  queue: ReturnType<typeof normalizeLiveActivityQueue>,
  options: { failed: boolean; iconUri?: string } = { failed: false },
): LiveActivityProps {
  const { done, total, pending, blocked } = queue;
  const determinate = total > 0;
  const headline = determinate ? `${done}/${total}` : '0/0';
  const failed = options.failed;
  const progress = syncProgress(queue);
  return {
    status: failed ? 'FAILED' : 'SYNCING',
    mode: 'sync',
    title: failed ? FAIL_TITLE : SYNC_TITLE,
    detail: '',
    subject: '',
    headline,
    caption: '',
    symbol: failed ? 'exclamationmark.triangle.fill' : 'arrow.triangle.2.circlepath',
    accent: failed ? FAIL_ACCENT : SYNC_ACCENT,
    done,
    total,
    progress,
    pending,
    blocked,
    retryAtMs: 0,
    determinate,
    iconUri: options.iconUri ?? '',
  };
}

/**
 * The Watch-style final frame: green check, filled count, "Sync complete".
 *
 * Built from the last syncing props because the outbox resets the wave on the
 * same tick the last photo settles — the resolver then sees an empty queue
 * and would otherwise tear the Island down with no success beat.
 */
export function succeededLiveActivityProps(
  from: LiveActivityProps,
  iconUri?: string,
): LiveActivityProps {
  const total = Math.max(clampCount(from.total), clampCount(from.done), 1);
  return {
    ...from,
    status: 'SUCCEEDED',
    title: SUCCESS_TITLE,
    detail: '',
    subject: '',
    headline: `${total}/${total}`,
    caption: '',
    symbol: 'checkmark.circle.fill',
    accent: SUCCESS_ACCENT,
    done: total,
    total,
    pending: 0,
    blocked: 0,
    progress: 1,
    determinate: true,
    iconUri: iconUri ?? from.iconUri,
  };
}

/**
 * The Island was showing a live wave, and the queue just went empty.
 * Cancel-before-anything-moved is not a success; a wave that had counts is.
 */
export function shouldCelebrateSyncSuccess(last: LiveActivityProps | null): boolean {
  if (!last) return false;
  if (last.status !== 'SYNCING') return false;
  if (last.total <= 0) return false;
  return last.done > 0 || last.progress > 0 || last.pending > 0;
}

/**
 * Present ONLY while photos still need to leave this phone.
 *
 * An empty queue is not news. A documenting session with nothing to upload
 * is not news either. The success frame is not returned here — it is a
 * one-shot painted by the pusher as it dismisses.
 */
export function resolveDesiredLiveActivity(input: LiveActivityInput): DesiredLiveActivity {
  if (!input.enabled) return { kind: 'idle' };
  if (!input.queue) return { kind: 'idle' };
  const queue = normalizeLiveActivityQueue(input.queue);
  if (queue.pending <= 0 && queue.blocked <= 0) return { kind: 'idle' };
  if (queue.blocked > 0 && queue.pending <= 0) {
    return { kind: 'active', props: buildSyncLiveActivityProps(queue, { failed: true }) };
  }
  return { kind: 'active', props: buildSyncLiveActivityProps(queue, { failed: false }) };
}

/**
 * Stable identity for skip-redundant updates. ActivityKit throttles updates
 * hard, so spending one on an identical frame costs a real update later.
 */
export function liveActivityContentKey(desired: DesiredLiveActivity): string {
  if (desired.kind === 'idle') return 'idle';
  const { mode, status, headline, determinate, progress, pending, blocked } = desired.props;
  return [
    mode,
    status,
    headline,
    determinate ? '1' : '0',
    determinate ? progress.toFixed(2) : '0',
    String(pending),
    String(blocked),
  ].join('|');
}
