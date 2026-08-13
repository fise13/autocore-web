import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCompletionProps,
  liveActivityContentKey,
  resolveDesiredLiveActivity,
  syncCountsFromJobs,
  type LiveActivityInput,
  type SyncJobLike,
} from './live-activity-model';

const NOW = new Date('2026-08-13T09:00:00.000Z');

function input(partial: Partial<LiveActivityInput> = {}): LiveActivityInput {
  return {
    enabled: true,
    online: true,
    photos: [],
    completedInWave: 0,
    waveTotal: 0,
    ...partial,
  };
}

function job(partial: Partial<SyncJobLike> & { status: SyncJobLike['status'] }): SyncJobLike {
  return { nextRetryAt: null, errorInfo: null, ...partial };
}

describe('syncCountsFromJobs', () => {
  it('tallies rows by status', () => {
    const counts = syncCountsFromJobs(
      input({
        photos: [
          job({ status: 'queued' }),
          job({ status: 'queued' }),
          job({ status: 'uploading' }),
          job({ status: 'failed' }),
        ],
      }),
    );
    assert.equal(counts.byStatus.queued, 2);
    assert.equal(counts.byStatus.uploading, 1);
    assert.equal(counts.byStatus.failed, 1);
  });

  it('takes the soonest scheduled retry, not the last one seen', () => {
    const counts = syncCountsFromJobs(
      input({
        photos: [
          job({ status: 'retry_scheduled', nextRetryAt: '2026-08-13T09:05:00.000Z' }),
          job({ status: 'retry_scheduled', nextRetryAt: '2026-08-13T09:01:00.000Z' }),
          job({ status: 'retry_scheduled', nextRetryAt: '2026-08-13T09:09:00.000Z' }),
        ],
      }),
    );
    assert.equal(counts.nextRetryAt, '2026-08-13T09:01:00.000Z');
  });

  it('ignores an unreadable retry timestamp instead of producing an invalid date', () => {
    const counts = syncCountsFromJobs(
      input({ photos: [job({ status: 'retry_scheduled', nextRetryAt: 'nonsense' })] }),
    );
    assert.equal(counts.nextRetryAt, null);
  });

  it('collects blocking codes once each, and only from failed rows', () => {
    const counts = syncCountsFromJobs(
      input({
        photos: [
          job({ status: 'failed', errorInfo: { code: 'AUTH_EXPIRED' } }),
          job({ status: 'failed', errorInfo: { code: 'AUTH_EXPIRED' } }),
          job({ status: 'failed', errorInfo: { code: 'FILE_TOO_LARGE' } }),
          job({ status: 'queued', errorInfo: { code: 'SERVER_5XX' } }),
        ],
      }),
    );
    assert.deepEqual(counts.blockingCodes, ['AUTH_EXPIRED', 'FILE_TOO_LARGE']);
  });
});

describe('resolveDesiredLiveActivity', () => {
  it('stays idle without a signed-in company with intake access', () => {
    const desired = resolveDesiredLiveActivity(
      input({ enabled: false, photos: [job({ status: 'queued' })] }),
      NOW,
    );
    assert.equal(desired.kind, 'idle');
  });

  it('stays idle on an empty queue — a permanent island teaches people to ignore it', () => {
    assert.equal(resolveDesiredLiveActivity(input(), NOW).kind, 'idle');
  });

  it('presents progress while uploading', () => {
    const desired = resolveDesiredLiveActivity(
      input({
        photos: [job({ status: 'uploading' }), job({ status: 'queued' })],
        completedInWave: 3,
        waveTotal: 5,
      }),
      NOW,
    );
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(desired.props.status, 'SYNCING');
    assert.equal(desired.props.headline, '3/5');
    assert.equal(desired.props.caption, 'photos');
    assert.equal(desired.props.determinate, true);
    assert.equal(desired.props.symbol, 'icloud.and.arrow.up.fill');
  });

  it('calls an offline queue a pause, and never uses failure language', () => {
    const desired = resolveDesiredLiveActivity(
      input({ online: false, photos: [job({ status: 'waiting_for_network' }), job({ status: 'waiting_for_network' })] }),
      NOW,
    );
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(desired.props.status, 'WAITING_FOR_NETWORK');
    assert.equal(desired.props.symbol, 'wifi.slash');
    assert.equal(desired.props.caption, 'queued');
    assert.equal(desired.props.determinate, false, 'no fake progress while parked');
    assert.doesNotMatch(`${desired.props.title} ${desired.props.detail}`, /fail|error/i);
  });

  it('keeps the retry title timeless and hands the countdown to the widget', () => {
    const desired = resolveDesiredLiveActivity(
      input({
        photos: [job({ status: 'retry_scheduled', nextRetryAt: '2026-08-13T09:00:30.000Z' })],
      }),
      NOW,
    );
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(desired.props.status, 'RETRYING');
    assert.equal(desired.props.title, 'Waiting to retry');
    assert.doesNotMatch(desired.props.title, /\d/, 'a baked-in number would go stale in a second');
    assert.equal(desired.props.retryAtMs, Date.parse('2026-08-13T09:00:30.000Z'));
  });

  it('escalates to ACTION_REQUIRED only when a person can fix it', () => {
    const desired = resolveDesiredLiveActivity(
      input({ photos: [job({ status: 'failed', errorInfo: { code: 'AUTH_EXPIRED' } })] }),
      NOW,
    );
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(desired.props.status, 'ACTION_REQUIRED');
    assert.equal(desired.props.caption, 'needs you');
  });

  it('reports a bad deploy as FAILED — signing in again would not help', () => {
    const desired = resolveDesiredLiveActivity(
      input({ photos: [job({ status: 'failed', errorInfo: { code: 'DEPLOY_REQUIRED' } })] }),
      NOW,
    );
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(desired.props.status, 'FAILED');
    assert.equal(desired.props.accent, '#FF453A');
  });

  it('shows a blocked count on its own — "0/3" reads like stalled progress', () => {
    const desired = resolveDesiredLiveActivity(
      input({
        photos: [
          job({ status: 'failed', errorInfo: { code: 'FILE_TOO_LARGE' } }),
          job({ status: 'failed', errorInfo: { code: 'FILE_TOO_LARGE' } }),
          job({ status: 'failed', errorInfo: { code: 'FILE_TOO_LARGE' } }),
        ],
      }),
      NOW,
    );
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(desired.props.headline, '3');
    assert.equal(desired.props.caption, 'blocked');
  });

  it('lets live uploads outrank stale failures', () => {
    const desired = resolveDesiredLiveActivity(
      input({
        photos: [
          job({ status: 'uploading' }),
          job({ status: 'failed', errorInfo: { code: 'FILE_TOO_LARGE' } }),
        ],
        completedInWave: 1,
        waveTotal: 2,
      }),
      NOW,
    );
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(desired.props.status, 'SYNCING');
    assert.equal(desired.props.blocked, 1, 'the failure is still carried alongside');
  });

  it('never emits a progress value outside 0–1', () => {
    const desired = resolveDesiredLiveActivity(
      input({ photos: [job({ status: 'queued' })], completedInWave: 99, waveTotal: 1 }),
      NOW,
    );
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.ok(desired.props.progress >= 0 && desired.props.progress <= 1);
  });
});

describe('liveActivityContentKey', () => {
  it('collapses identical frames so a throttled update is not wasted', () => {
    const a = resolveDesiredLiveActivity(input({ photos: [job({ status: 'queued' })] }), NOW);
    const b = resolveDesiredLiveActivity(input({ photos: [job({ status: 'queued' })] }), NOW);
    assert.equal(liveActivityContentKey(a), liveActivityContentKey(b));
  });

  it('changes when only the retry time moved — the countdown depends on it', () => {
    const first = resolveDesiredLiveActivity(
      input({ photos: [job({ status: 'retry_scheduled', nextRetryAt: '2026-08-13T09:00:30.000Z' })] }),
      NOW,
    );
    const second = resolveDesiredLiveActivity(
      input({ photos: [job({ status: 'retry_scheduled', nextRetryAt: '2026-08-13T09:02:00.000Z' })] }),
      NOW,
    );
    assert.notEqual(liveActivityContentKey(first), liveActivityContentKey(second));
  });

  it('has a stable idle identity', () => {
    assert.equal(liveActivityContentKey({ kind: 'idle' }), 'idle');
  });
});

describe('buildCompletionProps', () => {
  it('ends on a success frame rather than vanishing mid-upload', () => {
    const props = buildCompletionProps(18);
    assert.equal(props.status, 'SYNCED');
    assert.equal(props.title, '18 photos synced');
    assert.equal(props.progress, 1);
    assert.equal(props.pending, 0);
    assert.equal(props.symbol, 'checkmark.circle.fill');
  });

  it('reads naturally for a single photo', () => {
    assert.equal(buildCompletionProps(1).title, '1 photo synced');
  });

  it('never reports a negative count', () => {
    assert.equal(buildCompletionProps(-4).total, 0);
  });
});
