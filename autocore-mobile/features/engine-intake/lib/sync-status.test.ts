import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SyncJobStatus } from './sync-schedule';
import { resolveSyncSummary, type SyncCounts } from './sync-status';

const NOW = new Date('2026-08-12T20:00:00.000Z');

function counts(partial: Partial<SyncCounts> & { byStatus?: Partial<Record<SyncJobStatus, number>> }): SyncCounts {
  return {
    online: true,
    completedInWave: 0,
    waveTotal: 0,
    nextRetryAt: null,
    blockingCodes: [],
    ...partial,
    byStatus: {
      queued: 0,
      uploading: 0,
      waiting_for_network: 0,
      retry_scheduled: 0,
      failed: 0,
      completed: 0,
      ...(partial.byStatus ?? {}),
    },
  };
}

describe('resolveSyncSummary', () => {
  it('reports SYNCED on an empty queue', () => {
    const summary = resolveSyncSummary(counts({}), NOW);
    assert.equal(summary.status, 'SYNCED');
    assert.equal(summary.headline, 'Synced');
    assert.equal(summary.detail, null);
  });

  it('reports progress while uploading', () => {
    const summary = resolveSyncSummary(
      counts({ byStatus: { uploading: 1, queued: 9 }, completedInWave: 8, waveTotal: 18 }),
      NOW,
    );
    assert.equal(summary.status, 'SYNCING');
    assert.equal(summary.headline, 'Syncing 8 of 18');
    assert.equal(summary.progressLabel, '8/18');
    assert.ok(Math.abs(summary.progress - 8 / 18) < 1e-9);
  });

  it('calls an offline queue a pause, never a failure', () => {
    const summary = resolveSyncSummary(
      counts({ online: false, byStatus: { waiting_for_network: 3 } }),
      NOW,
    );
    assert.equal(summary.status, 'WAITING_FOR_NETWORK');
    assert.equal(summary.headline, 'Waiting for connection');
    assert.match(summary.detail ?? '', /saved on this iPhone/i);
    assert.doesNotMatch(`${summary.headline} ${summary.detail}`, /fail|error/i);
  });

  it('stays on the offline story even if the flag says online but every job is parked', () => {
    const summary = resolveSyncSummary(
      counts({ online: true, byStatus: { waiting_for_network: 2 } }),
      NOW,
    );
    assert.equal(summary.status, 'WAITING_FOR_NETWORK');
  });

  it('counts down to the next retry', () => {
    const summary = resolveSyncSummary(
      counts({
        byStatus: { retry_scheduled: 2 },
        nextRetryAt: '2026-08-12T20:00:30.000Z',
      }),
      NOW,
    );
    assert.equal(summary.status, 'RETRYING');
    assert.equal(summary.headline, 'Retrying in 30s');
    assert.match(summary.detail ?? '', /safe on this iPhone/i);
  });

  it('rounds a long retry to minutes', () => {
    const summary = resolveSyncSummary(
      counts({
        byStatus: { retry_scheduled: 1 },
        nextRetryAt: '2026-08-12T20:02:00.000Z',
      }),
      NOW,
    );
    assert.equal(summary.headline, 'Retrying in about 2 minutes');
  });

  it('escalates to ACTION_REQUIRED only when a person can fix it', () => {
    const summary = resolveSyncSummary(
      counts({ byStatus: { failed: 2 }, blockingCodes: ['AUTH_EXPIRED'] }),
      NOW,
    );
    assert.equal(summary.status, 'ACTION_REQUIRED');
    assert.equal(summary.headline, 'Action required');
  });

  it('reports FAILED — not ACTION_REQUIRED — when nothing the person does would help', () => {
    const summary = resolveSyncSummary(
      counts({ byStatus: { failed: 3 }, blockingCodes: ['DEPLOY_REQUIRED', 'FILE_MISSING'] }),
      NOW,
    );
    assert.equal(summary.status, 'FAILED');
    assert.match(summary.headline, /3 photos could not sync/);
    assert.match(summary.detail ?? '', /still on this iPhone/i);
  });

  it('lets live work outrank stale failures', () => {
    const summary = resolveSyncSummary(
      counts({
        byStatus: { uploading: 1, queued: 3, failed: 2 },
        completedInWave: 1,
        waveTotal: 5,
      }),
      NOW,
    );
    assert.equal(summary.status, 'SYNCING');
    assert.equal(summary.blocked, 2, 'the failures are still reported alongside');
  });

  it('never shows a denominator smaller than the work in hand', () => {
    const summary = resolveSyncSummary(
      counts({ byStatus: { queued: 4 }, completedInWave: 0, waveTotal: 0 }),
      NOW,
    );
    assert.equal(summary.total, 4);
    assert.equal(summary.progressLabel, '0/4');
  });

  it('reaches 18/18 rather than stalling at the wave total', () => {
    const summary = resolveSyncSummary(
      counts({ byStatus: {}, completedInWave: 18, waveTotal: 18 }),
      NOW,
    );
    assert.equal(summary.status, 'SYNCED');
    assert.equal(summary.pending, 0);
  });
});
