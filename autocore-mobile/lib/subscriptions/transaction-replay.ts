/**
 * What to do when StoreKit hands us a transaction we have seen before — L0.
 *
 * StoreKit replays the transaction an Apple ID already owns on every Buy tap
 * for a subscription it considers bought. Once the server starts recording
 * purchases, that is *most* taps: the boot drain settles the transaction, and
 * every later tap gets the same id back.
 *
 * The manager used to answer that by returning silently, having already
 * disarmed the sheet watchdog. The button stayed on `loading` with nothing
 * running that could move it — an endless spinner on a workspace that was in
 * fact already paid for. This module is that decision, extracted so it can be
 * tested: `subscription-manager.ts` imports `react-native-iap`, which cannot
 * load under `node --test`.
 *
 * Pure — no React, no native calls.
 */
import type { PurchaseFailure } from './types';

export type TransactionReplay =
  /** Not seen before: run the normal verify-and-finish path. */
  | { kind: 'settle' }
  /** Seen and accepted, and the user is waiting: show the success step. */
  | { kind: 'celebrate' }
  /** Seen and refused, and the user is waiting: show that refusal again. */
  | { kind: 'fail'; failure: PurchaseFailure }
  /**
   * Nothing to do here. Either the outcome is already owned by an in-flight
   * settle, or nobody is watching — a replay of a long-expired transaction
   * during the boot drain must not paint anything on an idle paywall.
   */
  | { kind: 'ignore'; keepWatchdog: boolean };

export type ReplayInput = {
  /**
   * The verdict the server already gave this transaction this session:
   * `null` for accepted, a failure for a refusal, `undefined` if never asked.
   */
  verdict: PurchaseFailure | null | undefined;
  /** Whether the transaction has been settled at all. */
  settled: boolean;
  /** A verify+finish for this exact transaction is already running. */
  inFlight: boolean;
  /** The purchase UI is showing a spinner right now. */
  flowBusy: boolean;
};

export function resolveTransactionReplay(input: ReplayInput): TransactionReplay {
  if (input.settled) {
    if (!input.flowBusy) return { kind: 'ignore', keepWatchdog: false };
    return input.verdict == null
      ? { kind: 'celebrate' }
      : { kind: 'fail', failure: input.verdict };
  }

  if (input.inFlight) {
    // That settle may have been started by the boot drain, which never touches
    // the flow. Leaving the watchdog armed means the worst case is a real
    // error after 25 seconds rather than a spinner that never ends.
    return { kind: 'ignore', keepWatchdog: true };
  }

  return { kind: 'settle' };
}
