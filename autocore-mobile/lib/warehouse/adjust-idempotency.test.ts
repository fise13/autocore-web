import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveAdjustIdempotencyKey, type AdjustAttempt } from './adjust-idempotency';

const NOW = 1_700_000_000_000;

function resolve(
  net: number,
  previous: AdjustAttempt | undefined,
  sequence = 1,
  now = NOW,
): AdjustAttempt {
  return resolveAdjustIdempotencyKey({ itemId: 'item_1', net, previous, sequence, now });
}

describe('stock adjustment idempotency key', () => {
  it('mints a key when nothing is outstanding', () => {
    const attempt = resolve(3, undefined);
    assert.equal(attempt.net, 3);
    assert.match(attempt.key, /^mobile:adjust:item_1:flush:/);
  });

  it('reuses the key when retrying the same net', () => {
    // The case that corrupted stock: a client-side timeout on a request the
    // server applied, then a retry that must not become a second movement.
    const first = resolve(3, undefined);
    const retry = resolve(3, first, 2, NOW + 5_000);
    assert.equal(retry.key, first.key, 'a retry of the same net must not mint a new key');
  });

  it('mints a new key once the net changes', () => {
    const first = resolve(3, undefined);
    const changed = resolve(4, first, 2);
    assert.notEqual(changed.key, first.key);
    assert.equal(changed.net, 4);
  });

  it('treats a sign flip as a different adjustment', () => {
    // +2 and −2 are the same magnitude and opposite intent. Sharing a key would
    // have the server answer the decrease with the increase it already recorded.
    const increase = resolve(2, undefined);
    const decrease = resolve(-2, increase, 2);
    assert.notEqual(decrease.key, increase.key);
  });

  it('never repeats a key across two mints in the same millisecond', () => {
    const a = resolve(1, undefined, 1, NOW);
    const b = resolve(2, undefined, 2, NOW);
    assert.notEqual(a.key, b.key, 'the sequence number is what separates these');
  });

  it('carries the net alongside the key so the caller can compare next time', () => {
    assert.equal(resolve(-7, undefined).net, -7);
  });
});
