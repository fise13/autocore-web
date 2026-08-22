/**
 * Retry schedule for purchases the server has not acknowledged.
 *
 * Pure and dependency-free so it can be tested without MMKV or React Native.
 * `pending-verification.ts` owns the storage; this owns the timing.
 */

/** Beyond this a transaction is almost certainly not ours to fix. */
export const MAX_VERIFICATION_ATTEMPTS = 40;

/**
 * Backoff in minutes, indexed by attempts already made.
 *
 * Index 0 is not zero on purpose. A purchase is recorded here *before* its
 * first verification is sent, so that a request which never returns still
 * leaves a trace; the half-minute at the front is what keeps the retry loop
 * from racing that first in-flight attempt.
 *
 * The tail stretches to twelve hours, because the long tail of failure is a
 * deployment missing its App Store credentials, and hammering that on every
 * app switch helps nobody.
 */
export const VERIFICATION_BACKOFF_MINUTES = [0.5, 0.5, 1, 2, 5, 10, 30, 60, 180, 360, 720];

const MINUTE_MS = 60_000;

export type VerificationTiming = {
  attempts: number;
  lastAttemptAt: number | null;
};

/** Milliseconds to wait after `attempts` failures before trying again. */
export function verificationBackoffMs(attempts: number): number {
  const index = Math.min(Math.max(attempts, 0), VERIFICATION_BACKOFF_MINUTES.length - 1);
  return VERIFICATION_BACKOFF_MINUTES[index] * MINUTE_MS;
}

/** Whether an entry may be retried now. */
export function isVerificationDue(entry: VerificationTiming, now: number): boolean {
  if (entry.attempts >= MAX_VERIFICATION_ATTEMPTS) return false;
  if (entry.lastAttemptAt === null) return true;
  return now - entry.lastAttemptAt >= verificationBackoffMs(entry.attempts);
}
