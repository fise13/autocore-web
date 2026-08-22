/**
 * What StoreKit's own view says about this Apple ID — L0.
 *
 * Lives apart from `entitlement-resolver.ts` for one practical reason: that
 * module's header claims to be pure, but it imports the entitlement cache and
 * so pulls in MMKV and React Native. It cannot load under `node --test`. This
 * one imports nothing but a type, and the type import is erased at build time.
 */
import type { LocalActiveSubscription } from './entitlement-resolver';

/**
 * Does this Apple ID already hold one of our subscriptions?
 *
 * Apple sells one subscription per subscription group per Apple ID. So when
 * someone with a live subscription taps Buy for a *second* workspace, StoreKit
 * does not open a purchase sheet at all — there is nothing to sell them. The
 * tap then sat on a spinner until the watchdog fired and reported that Apple
 * had failed to show a payment sheet, which was both untrue and a dead end.
 *
 * The real answer is to move the existing subscription, which the app already
 * implements as `restore({ transfer: true })`.
 *
 * Reads StoreKit rather than the server, so it holds even for a purchase the
 * server has not recorded yet.
 */
export function appleIdHoldsSubscription(
  local: readonly LocalActiveSubscription[],
  now: number,
): boolean {
  return local.some(
    (item) => item.isActive && (item.expirationDateMs === null || item.expirationDateMs > now),
  );
}
