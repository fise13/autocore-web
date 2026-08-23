/**
 * Which idempotency key a queued stock adjustment should be sent under.
 *
 * Pure and free of React so `node --test` can load it; the hook
 * (`use-optimistic-stock-adjust.ts`) owns the ref that stores the result.
 *
 * The rule it encodes, and why each half matters:
 *
 * - **Reuse the key when the net is unchanged.** A failed flush leaves the
 *   pending delta in place and the next flush sends the same net again. When the
 *   failure was a client-side timeout on a request the server actually applied,
 *   a fresh key made that second send a *second* movement — stock counted twice,
 *   with nothing in the UI to show it.
 * - **Mint a new key when the net changes, or after the delta is cleared.**
 *   The server answers a spent key with the movement it already recorded, so
 *   reusing one would silently drop a genuinely new adjustment rather than
 *   apply it.
 */

export type AdjustAttempt = {
  /** Signed net this key was issued for. */
  net: number;
  key: string;
};

export type ResolveAdjustKeyInput = {
  itemId: string;
  /** Signed net about to be sent. Never zero — a zero net is not sent at all. */
  net: number;
  /** What was last sent for this item, if a flush is still outstanding. */
  previous: AdjustAttempt | undefined;
  /** Monotonic counter, so two keys minted in the same millisecond differ. */
  sequence: number;
  /** Injected so the caller stays testable. */
  now: number;
};

export function resolveAdjustIdempotencyKey(input: ResolveAdjustKeyInput): AdjustAttempt {
  const { itemId, net, previous, sequence, now } = input;

  if (previous && previous.net === net) {
    return previous;
  }

  return { net, key: `mobile:adjust:${itemId}:flush:${sequence}:${now}` };
}
