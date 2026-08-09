export type LiveActivityMode = 'offline' | 'syncing' | 'failed';

export type DesiredLiveActivity =
  | { kind: 'idle' }
  | {
      kind: 'active';
      mode: LiveActivityMode;
      title: string;
      detail: string;
      /** Count shown in the island — 0 hides the trailing numeral. */
      count: number;
    };

export type LiveActivitySignals = {
  /** Device has no usable network. */
  offline: boolean;
  /** Outbox items waiting to upload (pending + syncing states). */
  pendingCount: number;
  /** Outbox items that failed and need attention. */
  failedCount: number;
  /** Drain currently running. */
  syncing: boolean;
  /** Signed-in company with intake permission — otherwise never show. */
  enabled: boolean;
};

/**
 * Live Activity / Dynamic Island policy:
 * show ONLY when there is actionable intake information.
 * Bare offline with an empty outbox stays idle — no empty island.
 */
export function resolveDesiredLiveActivity(signals: LiveActivitySignals): DesiredLiveActivity {
  if (!signals.enabled) return { kind: 'idle' };

  const pending = Math.max(0, signals.pendingCount);
  const failed = Math.max(0, signals.failedCount);
  const hasWork = pending > 0 || failed > 0;
  if (!hasWork) return { kind: 'idle' };

  if (failed > 0) {
    return {
      kind: 'active',
      mode: 'failed',
      title: 'Sync failed',
      detail:
        failed === 1
          ? '1 intake item needs a retry'
          : `${failed} intake items need a retry`,
      count: failed,
    };
  }

  if (signals.offline) {
    return {
      kind: 'active',
      mode: 'offline',
      title: 'Waiting offline',
      detail:
        pending === 1
          ? '1 item will sync when you are back online'
          : `${pending} items will sync when you are back online`,
      count: pending,
    };
  }

  return {
    kind: 'active',
    mode: 'syncing',
    title: signals.syncing ? 'Syncing' : 'Pending sync',
    detail:
      pending === 1 ? '1 intake item in the outbox' : `${pending} intake items in the outbox`,
    count: pending,
  };
}

/** Stable key for skip-redundant update/start. */
export function liveActivityContentKey(desired: DesiredLiveActivity): string {
  if (desired.kind === 'idle') return 'idle';
  return `${desired.mode}:${desired.count}:${desired.title}:${desired.detail}`;
}
