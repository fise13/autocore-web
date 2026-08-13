import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  liveActivityContentKey,
  resolveDesiredLiveActivity,
} from './resolve-desired-live-activity.ts';

const base = {
  syncedCount: 0,
  sessionTotal: 0,
};

describe('resolveDesiredLiveActivity', () => {
  it('stays idle when disabled even with outbox items', () => {
    assert.deepEqual(
      resolveDesiredLiveActivity({
        ...base,
        enabled: false,
        offline: true,
        pendingCount: 3,
        failedCount: 1,
        syncing: false,
      }),
      { kind: 'idle' },
    );
  });

  it('stays idle when offline with an empty outbox — no empty island', () => {
    assert.deepEqual(
      resolveDesiredLiveActivity({
        ...base,
        enabled: true,
        offline: true,
        pendingCount: 0,
        failedCount: 0,
        syncing: false,
      }),
      { kind: 'idle' },
    );
  });

  it('stays idle when online with nothing pending', () => {
    assert.deepEqual(
      resolveDesiredLiveActivity({
        ...base,
        enabled: true,
        offline: false,
        pendingCount: 0,
        failedCount: 0,
        syncing: true,
      }),
      { kind: 'idle' },
    );
  });

  it('prefers active photo sync over stale failures (no 0/18 inflation)', () => {
    const desired = resolveDesiredLiveActivity({
      ...base,
      enabled: true,
      offline: false,
      pendingCount: 4,
      failedCount: 14,
      syncing: true,
      syncedCount: 0,
      sessionTotal: 4,
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind === 'active') {
      assert.equal(desired.mode, 'syncing');
      assert.equal(desired.progressLabel, '0/4');
      assert.equal(desired.total, 4);
      assert.equal(desired.count, 4);
    }
  });

  it('shows failed only when no photos are still moving', () => {
    const desired = resolveDesiredLiveActivity({
      ...base,
      enabled: true,
      offline: false,
      pendingCount: 0,
      failedCount: 2,
      syncing: false,
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind === 'active') {
      assert.equal(desired.mode, 'failed');
      assert.equal(desired.count, 2);
      assert.equal(desired.progressLabel, '2');
    }
  });

  it('shows offline waiting when pending photos and no network', () => {
    const desired = resolveDesiredLiveActivity({
      ...base,
      enabled: true,
      offline: true,
      pendingCount: 4,
      failedCount: 0,
      syncing: false,
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind === 'active') {
      assert.equal(desired.mode, 'offline');
      assert.equal(desired.count, 4);
      assert.equal(desired.progressLabel, '0/4');
    }
  });

  it('shows syncing progress when pending online', () => {
    const desired = resolveDesiredLiveActivity({
      ...base,
      enabled: true,
      offline: false,
      pendingCount: 2,
      failedCount: 0,
      syncing: true,
      syncedCount: 3,
      sessionTotal: 5,
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind === 'active') {
      assert.equal(desired.mode, 'syncing');
      assert.equal(desired.progressLabel, '3/5');
      assert.equal(desired.progress, 0.6);
      assert.match(desired.detail, /3 of 5/);
    }
  });

  it('builds stable content keys', () => {
    assert.equal(liveActivityContentKey({ kind: 'idle' }), 'idle');
    assert.equal(
      liveActivityContentKey({
        kind: 'active',
        mode: 'syncing',
        title: 'Syncing photos',
        detail: '3 of 5 · 2 left',
        count: 2,
        done: 3,
        total: 5,
        progress: 0.6,
        progressLabel: '3/5',
      }),
      'syncing:3:5:2:Syncing photos:3 of 5 · 2 left',
    );
  });
});
