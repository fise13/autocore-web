/**
 * One sync status model, used by the banner, the diagnostics screen and the
 * Live Activity alike.
 *
 * Previously the camera chrome, the outbox banner and the Dynamic Island each
 * derived their own wording from raw counts, which is why offline could read as
 * "Sync failed" in one place and "Waiting offline" in another. Pure — no React.
 */
import type { SyncErrorCode } from './sync-errors';
import type { SyncJobStatus } from './sync-schedule';

export type SyncStatus =
  | 'SYNCED'
  | 'SYNCING'
  | 'WAITING_FOR_NETWORK'
  | 'RETRYING'
  | 'ACTION_REQUIRED'
  | 'FAILED';

export type SyncSummary = {
  status: SyncStatus;
  /** One short line — "Syncing 8 of 18". */
  headline: string;
  /** Optional second line explaining what happens next. */
  detail: string | null;
  done: number;
  total: number;
  /** 0–1. */
  progress: number;
  /** "8/18" for the compact Island. */
  progressLabel: string;
  /** Photos still on this device. */
  pending: number;
  /** Jobs that need a person. */
  blocked: number;
  /** When the soonest scheduled retry fires. */
  nextRetryAt: string | null;
};

export type SyncCounts = {
  online: boolean;
  /** Jobs by status, already scoped to the active company. */
  byStatus: Record<SyncJobStatus, number>;
  /** Photos confirmed uploaded in the current wave. */
  completedInWave: number;
  /** Wave size — completed + everything still outstanding. */
  waveTotal: number;
  nextRetryAt: string | null;
  /** Distinct codes across blocked jobs, so copy can name the cause. */
  blockingCodes: SyncErrorCode[];
};

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

function retryPhrase(nextRetryAt: string | null, now: Date): string | null {
  if (!nextRetryAt) return null;
  const due = Date.parse(nextRetryAt);
  if (!Number.isFinite(due)) return null;
  const seconds = Math.max(0, Math.round((due - now.getTime()) / 1000));
  if (seconds <= 1) return 'Retrying now';
  if (seconds < 60) return `Retrying in ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `Retrying in about ${minutes} ${plural(minutes, 'minute', 'minutes')}`;
}

/**
 * Blocked jobs only escalate to ACTION_REQUIRED when a person can actually do
 * something. A dead file or a bad deploy is FAILED — nagging someone to sign in
 * again would not help.
 */
function needsPerson(codes: SyncErrorCode[]): boolean {
  return codes.some((code) => code === 'AUTH_EXPIRED' || code === 'PERMISSION_DENIED');
}

export function resolveSyncSummary(counts: SyncCounts, now = new Date()): SyncSummary {
  const uploading = counts.byStatus.uploading ?? 0;
  const queued = counts.byStatus.queued ?? 0;
  const waiting = counts.byStatus.waiting_for_network ?? 0;
  const scheduled = counts.byStatus.retry_scheduled ?? 0;
  const blocked = counts.byStatus.failed ?? 0;

  const pending = uploading + queued + waiting + scheduled;
  const done = Math.max(0, counts.completedInWave);
  const total = Math.max(counts.waveTotal, done + pending, pending);
  const progress = total > 0 ? Math.min(1, done / total) : 0;
  const progressLabel = total > 0 ? `${done}/${total}` : String(pending);

  const base = {
    done,
    total,
    progress,
    progressLabel,
    pending,
    blocked,
    nextRetryAt: counts.nextRetryAt,
  };

  if (pending === 0 && blocked === 0) {
    return {
      ...base,
      status: 'SYNCED',
      headline: 'Synced',
      detail: null,
    };
  }

  // Offline outranks everything: it explains the pause, and it is not an error.
  if (pending > 0 && (!counts.online || waiting === pending)) {
    return {
      ...base,
      status: 'WAITING_FOR_NETWORK',
      headline: 'Waiting for connection',
      detail: `${pending} ${plural(pending, 'photo is', 'photos are')} saved on this iPhone and will sync automatically.`,
    };
  }

  if (uploading > 0 || (queued > 0 && counts.online)) {
    return {
      ...base,
      status: 'SYNCING',
      headline: total > 0 ? `Syncing ${done} of ${total}` : 'Syncing',
      detail: `${pending} ${plural(pending, 'photo', 'photos')} left.`,
    };
  }

  if (scheduled > 0) {
    return {
      ...base,
      status: 'RETRYING',
      headline: retryPhrase(counts.nextRetryAt, now) ?? 'Retrying shortly',
      detail: `${pending} ${plural(pending, 'photo is', 'photos are')} safe on this iPhone.`,
    };
  }

  if (blocked > 0 && needsPerson(counts.blockingCodes)) {
    return {
      ...base,
      status: 'ACTION_REQUIRED',
      headline: 'Action required',
      detail: `${blocked} ${plural(blocked, 'photo needs', 'photos need')} you before they can sync.`,
    };
  }

  if (blocked > 0) {
    return {
      ...base,
      status: 'FAILED',
      headline: `${blocked} ${plural(blocked, 'photo', 'photos')} could not sync`,
      detail: 'They are still on this iPhone. Open sync details to review.',
    };
  }

  return {
    ...base,
    status: 'SYNCING',
    headline: total > 0 ? `Syncing ${done} of ${total}` : 'Syncing',
    detail: null,
  };
}
