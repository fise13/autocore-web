import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appleIdHoldsSubscription } from './apple-id-ownership';
import type { LocalActiveSubscription } from './entitlement-resolver';

const NOW = Date.parse('2026-08-22T12:00:00.000Z');

function sub(overrides: Partial<LocalActiveSubscription> = {}): LocalActiveSubscription {
  return {
    productId: 'com.autocore.pro.monthly',
    isActive: true,
    expirationDateMs: NOW + 86_400_000,
    willAutoRenew: true,
    ...overrides,
  };
}

describe('appleIdHoldsSubscription', () => {
  it('is false when StoreKit has nothing', () => {
    assert.equal(appleIdHoldsSubscription([], NOW), false);
  });

  it('is true for a live subscription', () => {
    assert.equal(appleIdHoldsSubscription([sub()], NOW), true);
  });

  it('treats an unknown expiry as live', () => {
    // StoreKit omits the date in some replays; refusing to sell in that case is
    // the safe direction — the alternative is a purchase Apple will not open.
    assert.equal(appleIdHoldsSubscription([sub({ expirationDateMs: null })], NOW), true);
  });

  it('ignores one that has expired', () => {
    assert.equal(
      appleIdHoldsSubscription([sub({ expirationDateMs: NOW - 1 })], NOW),
      false,
    );
  });

  it('ignores one StoreKit no longer calls active', () => {
    assert.equal(appleIdHoldsSubscription([sub({ isActive: false })], NOW), false);
  });

  it('is true when any one of several is live', () => {
    assert.equal(
      appleIdHoldsSubscription(
        [sub({ isActive: false }), sub({ expirationDateMs: NOW - 1 }), sub()],
        NOW,
      ),
      true,
    );
  });

  it('does not fire before StoreKit has reported, so a first buy is never blocked', () => {
    // The list is empty until `refreshLocalSubscriptions` runs. Failing open
    // here is deliberate: blocking a genuine first purchase would be far worse
    // than letting a doomed second one reach StoreKit.
    assert.equal(appleIdHoldsSubscription([], NOW), false);
  });
});
