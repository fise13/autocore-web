/**
 * The Live Activity is a *view* of sync state, never its own source of truth.
 *
 * Everything the Dynamic Island, the Lock Screen banner and the widgets render
 * is derived here from the same `resolveSyncSummary` the in-app banner uses, so
 * a queue that reads "Waiting for connection" in the app can never read "Sync
 * failed" on the Lock Screen.
 *
 * This module is pure and runs under the root Node test runner — relative
 * imports only, and nothing that pulls React Native.
 *
 * The design tokens (accent, symbol, caption) are resolved *here* rather than in
 * the widget body on purpose: the widget function is serialized on its own and
 * cannot see module scope, so anything it needs has to arrive as a prop.
 */
import type { SyncErrorCode } from '../../engine-intake/lib/sync-errors';
import type { SyncJobStatus } from '../../engine-intake/lib/sync-schedule';
import {
  resolveSyncSummary,
  type SyncCounts,
  type SyncStatus,
  type SyncSummary,
} from '../../engine-intake/lib/sync-status';

/** The subset of an outbox row this module needs. */
export type SyncJobLike = {
  status: SyncJobStatus;
  nextRetryAt?: string | null;
  errorInfo?: { code: SyncErrorCode } | null;
};

export type LiveActivityInput = {
  /** Signed-in company with intake permission. Otherwise never present anything. */
  enabled: boolean;
  online: boolean;
  /** Photo rows only — command heartbeats must not inflate the denominator. */
  photos: readonly SyncJobLike[];
  /** Photos confirmed uploaded in the current wave. */
  completedInWave: number;
  /** Wave size — completed plus everything still outstanding. */
  waveTotal: number;
  /** What is being uploaded, e.g. "Bay 3" — shown as the Island's second line. */
  subject?: string | null;
};

/**
 * Flat, JSON-safe props. These cross into the widget extension through App Group
 * storage, so every field is a primitive.
 */
export type LiveActivityProps = {
  status: SyncStatus;
  /** Headline — "Syncing 8 of 18". */
  title: string;
  /** Supporting line — "10 photos left". */
  detail: string;
  /** What the work belongs to. Empty string when unknown. */
  subject: string;
  /** Big numeral — "8/18" while syncing, "3" when blocked. */
  headline: string;
  /** Word under the numeral — "photos" / "queued" / "blocked". */
  caption: string;
  /** SF Symbol name. Typed as literals so it stays assignable to `Image systemName`. */
  symbol: LiveActivitySymbol;
  /** Accent hex. */
  accent: string;
  done: number;
  total: number;
  /** 0–1. */
  progress: number;
  pending: number;
  blocked: number;
  /** Epoch ms of the next scheduled retry, or 0 when nothing is scheduled. */
  retryAtMs: number;
  /** Whether the progress bar has a meaningful value. */
  determinate: boolean;
  /** file:// URI of the app icon inside widgetsDirectory. Empty when unavailable. */
  iconUri: string;
};

export type DesiredLiveActivity =
  | { kind: 'idle' }
  | { kind: 'active'; props: LiveActivityProps };

/**
 * Apple's system accents rather than the AutoCore brand palette: the Island sits
 * in the system's chrome, not in the app, and a brand blue reads as a bug there.
 */
const ACCENTS: Record<SyncStatus, string> = {
  SYNCED: '#30D158',
  SYNCING: '#0A84FF',
  WAITING_FOR_NETWORK: '#8E8E93',
  RETRYING: '#FF9F0A',
  ACTION_REQUIRED: '#FF9F0A',
  FAILED: '#FF453A',
};

/**
 * Deliberately a literal union rather than `string`: `Image systemName` is typed
 * against the SF Symbol catalogue, so a typo here is a compile error instead of
 * a silently blank glyph on someone's Lock Screen.
 */
export type LiveActivitySymbol =
  | 'checkmark.circle.fill'
  | 'icloud.and.arrow.up.fill'
  | 'wifi.slash'
  | 'arrow.clockwise'
  | 'exclamationmark.circle.fill'
  | 'exclamationmark.triangle.fill';

const SYMBOLS: Record<SyncStatus, LiveActivitySymbol> = {
  SYNCED: 'checkmark.circle.fill',
  SYNCING: 'icloud.and.arrow.up.fill',
  WAITING_FOR_NETWORK: 'wifi.slash',
  RETRYING: 'arrow.clockwise',
  ACTION_REQUIRED: 'exclamationmark.circle.fill',
  FAILED: 'exclamationmark.triangle.fill',
};

export function liveActivityAccent(status: SyncStatus): string {
  return ACCENTS[status] ?? ACCENTS.SYNCING;
}

export function liveActivitySymbol(status: SyncStatus): LiveActivitySymbol {
  return SYMBOLS[status] ?? SYMBOLS.SYNCING;
}

/** Counting is deliberately not `Object.groupBy` — this file targets Node 20 too. */
export function syncCountsFromJobs(input: LiveActivityInput): SyncCounts {
  const byStatus: Record<SyncJobStatus, number> = {
    queued: 0,
    uploading: 0,
    waiting_for_network: 0,
    retry_scheduled: 0,
    failed: 0,
    completed: 0,
  };

  let soonestRetry: number | null = null;
  const blockingCodes: SyncErrorCode[] = [];

  for (const job of input.photos) {
    if (job.status in byStatus) byStatus[job.status] += 1;

    if (job.status === 'retry_scheduled' && job.nextRetryAt) {
      const due = Date.parse(job.nextRetryAt);
      if (Number.isFinite(due) && (soonestRetry === null || due < soonestRetry)) {
        soonestRetry = due;
      }
    }

    const code = job.status === 'failed' ? job.errorInfo?.code : undefined;
    if (code && !blockingCodes.includes(code)) blockingCodes.push(code);
  }

  return {
    online: input.online,
    byStatus,
    completedInWave: Math.max(0, input.completedInWave),
    waveTotal: Math.max(0, input.waveTotal),
    nextRetryAt: soonestRetry === null ? null : new Date(soonestRetry).toISOString(),
    blockingCodes,
  };
}

function captionFor(status: SyncStatus): string {
  if (status === 'SYNCED') return 'synced';
  if (status === 'FAILED') return 'blocked';
  if (status === 'ACTION_REQUIRED') return 'needs you';
  if (status === 'WAITING_FOR_NETWORK') return 'queued';
  if (status === 'RETRYING') return 'retrying';
  return 'photos';
}

/**
 * A blocked queue shows the blocked count on its own. "0/3" reads like progress
 * that stalled at zero, which is a different — and wrong — story.
 */
function headlineFor(status: SyncStatus, summary: SyncSummary): string {
  if (status === 'SYNCED') return 'Done';
  if (status === 'FAILED' || status === 'ACTION_REQUIRED') return String(summary.blocked);
  if (status === 'WAITING_FOR_NETWORK') return String(summary.pending);
  return summary.progressLabel;
}

export function buildLiveActivityProps(
  summary: SyncSummary,
  options: { subject?: string | null; iconUri?: string } = {},
): LiveActivityProps {
  return {
    status: summary.status,
    // A retry headline carries a number ("Retrying in 30s") that is correct for
    // exactly one second. The Island renders a real countdown from `retryAtMs`,
    // so the title stays timeless and the timer does the counting.
    title: summary.status === 'RETRYING' ? 'Waiting to retry' : summary.headline,
    detail: summary.detail ?? '',
    subject: options.subject?.trim() ?? '',
    headline: headlineFor(summary.status, summary),
    caption: captionFor(summary.status),
    symbol: liveActivitySymbol(summary.status),
    accent: liveActivityAccent(summary.status),
    done: summary.done,
    total: summary.total,
    progress: summary.progress,
    pending: summary.pending,
    blocked: summary.blocked,
    retryAtMs: summary.nextRetryAt ? parseEpoch(summary.nextRetryAt) : 0,
    determinate: summary.status === 'SYNCING' && summary.total > 0,
    iconUri: options.iconUri ?? '',
  };
}

function parseEpoch(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Present ONLY when there is something a person would want to glance at. An
 * empty queue is not news, and a permanent Island is the fastest way to teach
 * someone to ignore it.
 */
export function resolveDesiredLiveActivity(
  input: LiveActivityInput,
  now = new Date(),
): DesiredLiveActivity {
  if (!input.enabled) return { kind: 'idle' };

  const summary = resolveSyncSummary(syncCountsFromJobs(input), now);
  if (summary.status === 'SYNCED') return { kind: 'idle' };

  return {
    kind: 'active',
    props: buildLiveActivityProps(summary, { subject: input.subject }),
  };
}

/**
 * The frame the Island shows for a few seconds as it ends. Apple's own pattern —
 * a queue that vanishes mid-upload reads as a crash, not as success.
 */
export function buildCompletionProps(
  synced: number,
  options: { subject?: string | null; iconUri?: string } = {},
): LiveActivityProps {
  const total = Math.max(0, synced);
  return {
    status: 'SYNCED',
    title: total === 1 ? '1 photo synced' : `${total} photos synced`,
    detail: 'Everything on this iPhone is backed up.',
    subject: options.subject?.trim() ?? '',
    headline: 'Done',
    caption: 'synced',
    symbol: liveActivitySymbol('SYNCED'),
    accent: liveActivityAccent('SYNCED'),
    done: total,
    total,
    progress: 1,
    pending: 0,
    blocked: 0,
    retryAtMs: 0,
    determinate: true,
    iconUri: options.iconUri ?? '',
  };
}

/**
 * Stable identity for skip-redundant updates. ActivityKit throttles updates
 * hard, so spending one on an identical frame costs a real update later.
 *
 * `retryAtMs` is deliberately included: the Island renders a live countdown from
 * it, and a rescheduled retry has to reach the widget even when nothing else moved.
 */
export function liveActivityContentKey(desired: DesiredLiveActivity): string {
  if (desired.kind === 'idle') return 'idle';
  const { status, done, total, pending, blocked, retryAtMs, title, detail, subject } = desired.props;
  return [status, done, total, pending, blocked, retryAtMs, title, detail, subject].join('|');
}
