import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  netInfoSaysOnline,
  OFFLINE_COMMIT_GRACE_MS,
  resolveCommittedOnline,
} from './netinfo-online';

describe('netInfoSaysOnline', () => {
  it('treats a live link as online even when reachability is false', () => {
    assert.equal(netInfoSaysOnline({ isConnected: true, isInternetReachable: null }), true);
    assert.equal(netInfoSaysOnline({ isConnected: true, isInternetReachable: undefined }), true);
    assert.equal(netInfoSaysOnline({ isConnected: true, isInternetReachable: false }), true);
  });

  it('is offline only when the radio reports disconnected', () => {
    assert.equal(netInfoSaysOnline({ isConnected: false, isInternetReachable: true }), false);
    assert.equal(netInfoSaysOnline({ isConnected: null, isInternetReachable: null }), false);
  });
});

describe('resolveCommittedOnline', () => {
  it('commits online immediately when the link is up', () => {
    const next = resolveCommittedOnline({
      net: { isConnected: true, isInternetReachable: false },
      appState: 'active',
      lastOnline: false,
      nowMs: 10_000,
    });
    assert.equal(next.online, true);
    assert.equal(next.offlineCandidateSinceMs, null);
  });

  it('does not flip to offline on a single foreground disconnect blip', () => {
    const first = resolveCommittedOnline({
      net: { isConnected: false },
      appState: 'active',
      lastOnline: true,
      nowMs: 10_000,
    });
    assert.equal(first.online, true);
    assert.equal(first.offlineCandidateSinceMs, 10_000);

    const mid = resolveCommittedOnline({
      net: { isConnected: false },
      appState: 'active',
      lastOnline: true,
      nowMs: 10_000 + OFFLINE_COMMIT_GRACE_MS - 1,
      offlineCandidateSinceMs: first.offlineCandidateSinceMs,
    });
    assert.equal(mid.online, true);

    const committed = resolveCommittedOnline({
      net: { isConnected: false },
      appState: 'active',
      lastOnline: true,
      nowMs: 10_000 + OFFLINE_COMMIT_GRACE_MS,
      offlineCandidateSinceMs: first.offlineCandidateSinceMs,
    });
    assert.equal(committed.online, false);
  });

  it('does not flip to offline when leaving the app — iOS NetInfo lies then', () => {
    assert.equal(
      resolveCommittedOnline({
        net: { isConnected: false, isInternetReachable: false },
        appState: 'inactive',
        lastOnline: true,
      }).online,
      true,
    );
    assert.equal(
      resolveCommittedOnline({
        net: { isConnected: false, isInternetReachable: false },
        appState: 'background',
        lastOnline: true,
      }).online,
      true,
    );
  });

  it('keeps a real offline stretch if the app was already offline', () => {
    assert.equal(
      resolveCommittedOnline({
        net: { isConnected: false },
        appState: 'background',
        lastOnline: false,
      }).online,
      false,
    );
  });

  it('still accepts an online reading in the background', () => {
    assert.equal(
      resolveCommittedOnline({
        net: { isConnected: true, isInternetReachable: true },
        appState: 'background',
        lastOnline: false,
      }).online,
      true,
    );
  });
});
