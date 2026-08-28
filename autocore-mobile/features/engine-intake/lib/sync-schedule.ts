/**
 * Retry scheduling and the job state machine.
 *
 * The outbox had no retry scheduling at all: a non-terminal failure reset the
 * row to `pending` and then nothing ran until something else happened to call
 * `drain` again. There was no backoff, no `nextRetryAt`, and no way to tell
 * "offline" apart from "failing", so an offline stretch burned attempts.
 *
 * Everything here is persisted state — no `setTimeout` closure that dies with
 * the process. Pure: no React, no clock of its own (callers pass `now`).
 */

export const SYNC_JOB_STATUSES = [
  'queued',
  'uploading',
  'waiting_for_network',
  'retry_scheduled',
  'failed',
  'completed',
] as const;

export type SyncJobStatus = (typeof SYNC_JOB_STATUSES)[number];

/** 5s → 15s → 30s → 1m → 2m → 5m → 10m, then held at 10m. */
export const RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000, 600_000] as const;

/**
 * After this many *server-side* attempts a job stops rescheduling itself and
 * waits for a person. Offline stretches never count toward it.
 */
export const MAX_RETRY_ATTEMPTS = 10;

export function retryDelayMs(attemptCount: number): number {
  const index = Math.min(Math.max(attemptCount, 1), RETRY_DELAYS_MS.length) - 1;
  return RETRY_DELAYS_MS[index] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!;
}

export function nextRetryAt(attemptCount: number, now = new Date()): string {
  return new Date(now.getTime() + retryDelayMs(attemptCount)).toISOString();
}

export type SchedulableJob = {
  status: SyncJobStatus;
  attemptCount: number;
  nextRetryAt?: string | null;
};

/** A job the drain may pick up right now, given the network and the clock. */
export function isJobRunnable(
  job: SchedulableJob,
  options: { online: boolean; now?: Date },
): boolean {
  const now = options.now ?? new Date();

  if (job.status === 'completed' || job.status === 'failed') return false;
  if (!options.online) return false;

  // A crashed run left this row mid-flight; the launch reconcile requeues it.
  if (job.status === 'uploading') return true;
  if (job.status === 'queued') return true;
  if (job.status === 'waiting_for_network') return true;

  if (job.status === 'retry_scheduled') {
    if (!job.nextRetryAt) return true;
    const due = Date.parse(job.nextRetryAt);
    return !Number.isFinite(due) || due <= now.getTime();
  }

  return false;
}

/**
 * The next status after an attempt fails.
 *
 * Offline is not a failure: the job parks in `waiting_for_network` and its
 * attempt count is rolled back, so a tunnel does not exhaust the budget.
 */
export function resolveFailureTransition(input: {
  attemptCount: number;
  retryable: boolean;
  offline: boolean;
  /**
   * The failure was the link, not the request (see `isTransportSyncError`).
   * Such a job never gives up: it holds at the ceiling delay indefinitely.
   */
  transport?: boolean;
  now?: Date;
}): { status: SyncJobStatus; attemptCount: number; nextRetryAt: string | null } {
  const now = input.now ?? new Date();

  if (input.offline) {
    return {
      status: 'waiting_for_network',
      attemptCount: Math.max(0, input.attemptCount - 1),
      nextRetryAt: null,
    };
  }

  if (!input.retryable) {
    return { status: 'failed', attemptCount: input.attemptCount, nextRetryAt: null };
  }

  // A yard with no signal is not a broken job. Ten attempts is roughly twenty
  // minutes of ceiling delay — a lunch break behind a steel wall used to be
  // enough to exhaust the budget and turn a perfectly good photo red, with a
  // "retry" the worker then had to find and press. Transport failures keep
  // their place in the queue instead, and the attempt count stops climbing so
  // the schedule holds at the ten-minute ceiling rather than growing forever.
  if (input.transport) {
    const held = Math.min(input.attemptCount, RETRY_DELAYS_MS.length);
    return {
      status: 'retry_scheduled',
      attemptCount: held,
      nextRetryAt: nextRetryAt(held, now),
    };
  }

  if (input.attemptCount >= MAX_RETRY_ATTEMPTS) {
    return { status: 'failed', attemptCount: input.attemptCount, nextRetryAt: null };
  }

  return {
    status: 'retry_scheduled',
    attemptCount: input.attemptCount,
    nextRetryAt: nextRetryAt(input.attemptCount, now),
  };
}

/**
 * Soonest moment the queue has work again, so the manager can arm exactly one
 * timer instead of one per job. `null` = nothing is waiting on a clock.
 */
export function nextWakeUpAt(jobs: SchedulableJob[], now = new Date()): Date | null {
  let soonest: number | null = null;
  for (const job of jobs) {
    if (job.status !== 'retry_scheduled' || !job.nextRetryAt) continue;
    const due = Date.parse(job.nextRetryAt);
    if (!Number.isFinite(due)) continue;
    if (due <= now.getTime()) return now;
    if (soonest == null || due < soonest) soonest = due;
  }
  return soonest == null ? null : new Date(soonest);
}

/**
 * Launch reconcile. A row left `uploading` means the process died mid-flight —
 * that is not a failure, and the file is still on disk. Requeue it; the server
 * deduplicates by idempotency key.
 */
export function reconcileOnLaunch<T extends SchedulableJob>(jobs: T[]): T[] {
  return jobs.map((job) =>
    job.status === 'uploading' ? { ...job, status: 'queued' as const } : job,
  );
}
