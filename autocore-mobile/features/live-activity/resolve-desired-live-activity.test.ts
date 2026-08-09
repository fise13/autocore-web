import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  liveActivityContentKey,
  resolveDesiredLiveActivity,
} from './resolve-desired-live-activity.ts';

describe('resolveDesiredLiveActivity', () => {
  it('stays idle when disabled even with outbox items', () => {
    assert.deepEqual(
      resolveDesiredLiveActivity({
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
        enabled: true,
        offline: false,
        pendingCount: 0,
        failedCount: 0,
        syncing: true,
      }),
      { kind: 'idle' },
    );
  });

  it('shows failed when outbox has failures', () => {
    const desired = resolveDesiredLiveActivity({
      enabled: true,
      offline: false,
      pendingCount: 2,
      failedCount: 1,
      syncing: false,
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind === 'active') {
      assert.equal(desired.mode, 'failed');
      assert.equal(desired.count, 1);
    }
  });

  it('shows offline waiting when pending items and no network', () => {
    const desired = resolveDesiredLiveActivity({
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
    }
  });

  it('shows syncing when pending online', () => {
    const desired = resolveDesiredLiveActivity({
      enabled: true,
      offline: false,
      pendingCount: 2,
      failedCount: 0,
      syncing: true,
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind === 'active') {
      assert.equal(desired.mode, 'syncing');
      assert.equal(desired.count, 2);
    }
  });

  it('builds stable content keys', () => {
    assert.equal(liveActivityContentKey({ kind: 'idle' }), 'idle');
    assert.equal(
      liveActivityContentKey({
        kind: 'active',
        mode: 'syncing',
        title: 'Syncing',
        detail: '2 intake items in the outbox',
        count: 2,
      }),
      'syncing:2:Syncing:2 intake items in the outbox',
    );
  });
});
