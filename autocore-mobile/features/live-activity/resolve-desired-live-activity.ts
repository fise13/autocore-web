export type LiveActivityMode = 'offline' | 'syncing' | 'failed';

export type DesiredLiveActivity =
  | { kind: 'idle' }
  | {
      kind: 'active';
      mode: LiveActivityMode;
      title: string;
      detail: string;
      /** Compact trailing numeral / primary count. */
      count: number;
      /** Successfully synced photos in this wave. */
      done: number;
      /** Total photos in this wave (done + still outstanding). */
      total: number;
      /** 0–1 progress. */
      progress: number;
      /** Short fraction for Island, e.g. "2/5". */
      progressLabel: string;
    };

export type LiveActivitySignals = {
  /** Device has no usable network. */
  offline: boolean;
  /**
   * Photos waiting to upload (pending + syncing). Island progress is photo-only —
   * heartbeats / failed leftovers must not inflate the denominator.
   */
  pendingCount: number;
  /** Photos that failed upload. */
  failedCount: number;
  /** Drain currently running. */
  syncing: boolean;
  /** Photos successfully drained in the current sync wave. */
  syncedCount: number;
  /** Peak photo work size for the current wave. */
  sessionTotal: number;
  /** Signed-in company with intake permission — otherwise never show. */
  enabled: boolean;
};

function progressFields(signals: LiveActivitySignals): {
  done: number;
  total: number;
  progress: number;
  progressLabel: string;
  count: number;
} {
  const pending = Math.max(0, signals.pendingCount);
  const done = Math.max(0, signals.syncedCount);
  // Wave total = photos we set out to upload this wave. Do not add failed.
  const total = Math.max(signals.sessionTotal, done + pending, pending);
  const progress = total > 0 ? Math.min(1, done / total) : 0;
  const progressLabel = total > 0 ? `${done}/${total}` : String(pending);
  return {
    done,
    total,
    progress,
    progressLabel,
    count: pending > 0 ? pending : done,
  };
}

/**
 * Live Activity / Dynamic Island policy:
 * show ONLY when there are photos actively moving (or failed photos need attention).
 * Prefer an active sync wave over stale failures so "4 syncing" isn't shown as 0/18.
 */
export function resolveDesiredLiveActivity(signals: LiveActivitySignals): DesiredLiveActivity {
  if (!signals.enabled) return { kind: 'idle' };

  const pending = Math.max(0, signals.pendingCount);
  const failed = Math.max(0, signals.failedCount);

  if (pending > 0) {
    const progress = progressFields(signals);

    if (signals.offline) {
      return {
        kind: 'active',
        mode: 'offline',
        title: 'Waiting offline',
        detail:
          pending === 1
            ? '1 photo will sync when you are back online'
            : `${pending} photos will sync when you are back online`,
        ...progress,
        count: pending,
      };
    }

    return {
      kind: 'active',
      mode: 'syncing',
      title: signals.syncing ? 'Syncing photos' : 'Photos queued',
      detail:
        progress.total > 0
          ? `${progress.done} of ${progress.total} · ${pending} left`
          : pending === 1
            ? '1 photo waiting to sync'
            : `${pending} photos waiting to sync`,
      ...progress,
    };
  }

  if (failed > 0) {
    return {
      kind: 'active',
      mode: 'failed',
      title: 'Sync failed',
      detail: failed === 1 ? '1 photo needs attention' : `${failed} photos need attention`,
      done: 0,
      total: failed,
      progress: 0,
      // Show the failed count alone — "0/1" reads like progress and confuses.
      progressLabel: String(failed),
      count: failed,
    };
  }

  return { kind: 'idle' };
}

/** Stable key for skip-redundant update/start. */
export function liveActivityContentKey(desired: DesiredLiveActivity): string {
  if (desired.kind === 'idle') return 'idle';
  return `${desired.mode}:${desired.done}:${desired.total}:${desired.count}:${desired.title}:${desired.detail}`;
}
