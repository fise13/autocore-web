import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  liveActivityContentKey,
  normalizeLiveActivityQueue,
  resolveDesiredLiveActivity,
  shouldCelebrateSyncSuccess,
  succeededLiveActivityProps,
  type LiveActivityQueue,
} from './live-activity-model';

const queue = (partial: Partial<LiveActivityQueue> = {}): LiveActivityQueue => ({
  done: 0,
  total: 0,
  pending: 0,
  blocked: 0,
  uploading: 0,
  uploadRatio: null,
  ...partial,
});

describe('normalizeLiveActivityQueue', () => {
  it('lifts total to cover done + pending + blocked', () => {
    assert.deepEqual(normalizeLiveActivityQueue(queue({ done: 3, pending: 5 })), {
      done: 3,
      total: 8,
      pending: 5,
      blocked: 0,
      uploading: 0,
      uploadRatio: null,
    });
  });

  it('floors junk counts rather than painting NaN on the Island', () => {
    assert.deepEqual(
      normalizeLiveActivityQueue(queue({ done: -1, total: 1.9, pending: Number.NaN })),
      { done: 0, total: 1, pending: 0, blocked: 0, uploading: 0, uploadRatio: null },
    );
  });
});

describe('resolveDesiredLiveActivity', () => {
  it('stays idle without intake permission', () => {
    assert.deepEqual(
      resolveDesiredLiveActivity({
        enabled: false,
        queue: queue({ pending: 4, total: 4 }),
      }),
      { kind: 'idle' },
    );
  });

  it('stays idle when the queue is empty — even mid-session', () => {
    assert.equal(
      resolveDesiredLiveActivity({ enabled: true, queue: queue() }).kind,
      'idle',
    );
    assert.equal(
      resolveDesiredLiveActivity({ enabled: true, queue: queue({ done: 8, total: 8 }) }).kind,
      'idle',
    );
    assert.equal(resolveDesiredLiveActivity({ enabled: true, queue: null }).kind, 'idle');
  });

  it('shows synced/total while photos are still leaving', () => {
    const desired = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({ done: 3, total: 8, pending: 5 }),
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(desired.props.status, 'SYNCING');
    assert.equal(desired.props.mode, 'sync');
    assert.equal(desired.props.headline, '3/8');
    // The banner has room for one noun, and `3/8` alone on a Lock Screen says
    // nothing about what was counted.
    assert.equal(desired.props.title, 'Engine photos');
    assert.equal(desired.props.subject, '');
    assert.equal(desired.props.detail, '');
    assert.doesNotMatch(desired.props.title, /documenting/i);
    assert.equal(desired.props.progress, 3 / 8);
    assert.equal(desired.props.determinate, true);
    assert.equal(desired.props.symbol, 'arrow.triangle.2.circlepath');
    assert.equal(desired.props.accent, '#0A84FF');
  });

  it('moves the bar with live bytes while the count is still 0/2', () => {
    const desired = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({
        done: 0,
        total: 2,
        pending: 2,
        uploading: 1,
        uploadRatio: 0.5,
      }),
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(desired.props.headline, '0/2');
    assert.equal(desired.props.progress, 0.25);
  });

  it('keeps the same N/M frame when photos are parked with no signal', () => {
    // Offline is not a failure. The photos are on the phone; the count is the news.
    const desired = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({ done: 0, total: 6, pending: 6 }),
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(desired.props.status, 'SYNCING');
    assert.equal(desired.props.headline, '0/6');
    assert.equal(desired.props.accent, '#0A84FF');
    // Same label as a photo uploading at full speed: the label names the
    // subject, and the queue's mood is not the subject.
    assert.equal(desired.props.title, 'Engine photos');
    assert.doesNotMatch(`${desired.props.title} ${desired.props.detail}`, /waiting|connection|offline/i);
  });

  it('uses a quiet fail only when the remaining photos need the person', () => {
    const desired = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({ done: 4, total: 6, pending: 0, blocked: 2 }),
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(desired.props.status, 'FAILED');
    assert.equal(desired.props.headline, '4/6');
    assert.equal(desired.props.symbol, 'exclamationmark.triangle.fill');
    assert.equal(desired.props.accent, '#FF453A');
    assert.equal(desired.props.title, 'Photos need you');
  });

  it('never lets the label grow into a sentence about the queue', () => {
    // The Island is two rows of chrome. A label that narrates state is how a
    // count turns into a paragraph nobody reads.
    for (const input of [
      queue({ done: 3, total: 8, pending: 5 }),
      queue({ done: 4, total: 6, pending: 0, blocked: 2 }),
      queue({ done: 0, total: 6, pending: 6 }),
    ]) {
      const desired = resolveDesiredLiveActivity({ enabled: true, queue: input });
      assert.equal(desired.kind, 'active');
      if (desired.kind !== 'active') continue;
      assert.ok(desired.props.title.split(' ').length <= 3, desired.props.title);
      assert.ok(desired.props.title.length <= 20, desired.props.title);
      assert.doesNotMatch(desired.props.title, /\d/);
    }
  });

  it('keeps syncing — not fail — while other photos can still move', () => {
    const desired = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({ done: 2, pending: 3, blocked: 1 }),
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(desired.props.status, 'SYNCING');
    assert.equal(desired.props.headline, '2/6');
  });
});

describe('succeededLiveActivityProps', () => {
  it('paints a Watch-style check from the last syncing count', () => {
    const desired = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({ done: 2, total: 3, pending: 1 }),
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(shouldCelebrateSyncSuccess(desired.props), true);
    const success = succeededLiveActivityProps(desired.props);
    assert.equal(success.status, 'SUCCEEDED');
    assert.equal(success.title, 'Sync complete');
    assert.equal(success.headline, '3/3');
    assert.equal(success.progress, 1);
    assert.equal(success.symbol, 'checkmark.circle.fill');
    assert.equal(success.accent, '#30D158');
    assert.ok(success.title.split(' ').length <= 3);
    assert.ok(success.title.length <= 20);
  });

  it('does not celebrate a fail frame or an empty last snapshot', () => {
    const failed = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({ done: 4, total: 6, pending: 0, blocked: 2 }),
    });
    assert.equal(failed.kind, 'active');
    if (failed.kind !== 'active') return;
    assert.equal(shouldCelebrateSyncSuccess(failed.props), false);
    assert.equal(shouldCelebrateSyncSuccess(null), false);
    assert.equal(
      shouldCelebrateSyncSuccess(succeededLiveActivityProps(failed.props)),
      false,
    );
  });

  it('still celebrates a 0/N frame that was in flight — the last photo has no  N/N tick', () => {
    const desired = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({ done: 0, total: 1, pending: 1 }),
    });
    assert.equal(desired.kind, 'active');
    if (desired.kind !== 'active') return;
    assert.equal(shouldCelebrateSyncSuccess(desired.props), true);
    assert.equal(succeededLiveActivityProps(desired.props).headline, '1/1');
  });
});

describe('liveActivityContentKey', () => {
  it('is idle for an empty queue and changes when a photo lands', () => {
    assert.equal(liveActivityContentKey({ kind: 'idle' }), 'idle');
    const a = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({ done: 1, pending: 2, total: 3 }),
    });
    const b = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({ done: 2, pending: 1, total: 3 }),
    });
    assert.notEqual(liveActivityContentKey(a), liveActivityContentKey(b));
  });

  it('changes when bytes move even if the photo count has not', () => {
    const a = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({ pending: 2, total: 2, uploading: 1, uploadRatio: 0.2 }),
    });
    const b = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({ pending: 2, total: 2, uploading: 1, uploadRatio: 0.8 }),
    });
    assert.notEqual(liveActivityContentKey(a), liveActivityContentKey(b));
  });

  it('treats the success frame as a different update than the last syncing count', () => {
    const syncing = resolveDesiredLiveActivity({
      enabled: true,
      queue: queue({ done: 2, total: 3, pending: 1 }),
    });
    assert.equal(syncing.kind, 'active');
    if (syncing.kind !== 'active') return;
    const success = succeededLiveActivityProps(syncing.props);
    assert.notEqual(
      liveActivityContentKey(syncing),
      liveActivityContentKey({ kind: 'active', props: success }),
    );
  });
});
