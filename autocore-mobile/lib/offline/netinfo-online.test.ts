import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { netInfoSaysOnline, resolveCommittedOnline } from './netinfo-online';

describe('netInfoSaysOnline', () => {
  it('treats undetermined reachability as online when the radio is up', () => {
    assert.equal(netInfoSaysOnline({ isConnected: true, isInternetReachable: null }), true);
    assert.equal(netInfoSaysOnline({ isConnected: true, isInternetReachable: undefined }), true);
  });

  it('is offline only when the radio is down or reachability is false', () => {
    assert.equal(netInfoSaysOnline({ isConnected: false, isInternetReachable: true }), false);
    assert.equal(netInfoSaysOnline({ isConnected: true, isInternetReachable: false }), false);
    assert.equal(netInfoSaysOnline({ isConnected: null, isInternetReachable: null }), false);
  });
});

describe('resolveCommittedOnline', () => {
  it('trusts NetInfo while the app is in the foreground', () => {
    assert.equal(
      resolveCommittedOnline({
        net: { isConnected: false, isInternetReachable: false },
        appState: 'active',
        lastOnline: true,
      }),
      false,
    );
    assert.equal(
      resolveCommittedOnline({
        net: { isConnected: true, isInternetReachable: true },
        appState: 'active',
        lastOnline: false,
      }),
      true,
    );
  });

  it('does not flip to offline when leaving the app — iOS NetInfo lies then', () => {
    assert.equal(
      resolveCommittedOnline({
        net: { isConnected: false, isInternetReachable: false },
        appState: 'inactive',
        lastOnline: true,
      }),
      true,
    );
    assert.equal(
      resolveCommittedOnline({
        net: { isConnected: false, isInternetReachable: false },
        appState: 'background',
        lastOnline: true,
      }),
      true,
    );
  });

  it('keeps a real offline stretch if the app was already offline', () => {
    assert.equal(
      resolveCommittedOnline({
        net: { isConnected: false },
        appState: 'background',
        lastOnline: false,
      }),
      false,
    );
  });

  it('still accepts an online reading in the background', () => {
    assert.equal(
      resolveCommittedOnline({
        net: { isConnected: true, isInternetReachable: true },
        appState: 'background',
        lastOnline: false,
      }),
      true,
    );
  });
});
