/**
 * Unconfirmed purchases — L2c, persistent.
 *
 * StoreKit charging the card and our server recording the entitlement are two
 * separate events, and only the first is guaranteed. Anything between them —
 * a dropped connection, a 502 from Apple's App Store Server API, a deploy
 * without `APPLE_APP_STORE_*` configured — used to be swallowed by an empty
 * `catch` with a comment promising a retry that could not happen, because the
 * transaction had already been marked verified.
 *
 * This queue is that retry. It lives in MMKV, so it survives the process, and
 * it is keyed by `transactionId`, which Apple resolves forever — the server can
 * re-fetch the transaction long after StoreKit stopped replaying it.
 *
 * Entries leave the queue in exactly two ways: the server accepted the purchase,
 * or the server refused it for a reason that will never change.
 */
import { getJson, setJson } from '@/lib/storage/kv';

import { isVerificationDue } from './verification-schedule';

const STORAGE_KEY = 'autocore-mobile:pending-verification:v1';

export type PendingVerification = {
  transactionId: string;
  productId: string;
  companyId: string;
  /** Present when the token was minted before the sheet opened. */
  appAccountToken: string | null;
  attempts: number;
  firstSeenAt: number;
  lastAttemptAt: number | null;
  lastError: string | null;
};

type PersistedQueue = { items: PendingVerification[] };

let items: PendingVerification[] = getJson<PersistedQueue>(STORAGE_KEY)?.items ?? [];
const listeners = new Set<() => void>();

function persist(): void {
  try {
    setJson(STORAGE_KEY, { items } satisfies PersistedQueue);
  } catch {
    // A storage failure must never break a purchase; the in-memory queue still
    // drains this session.
  }
  for (const listener of listeners) listener();
}

export function subscribePendingVerification(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function pendingVerifications(): PendingVerification[] {
  return items;
}

const NO_VERIFICATIONS: PendingVerification[] = [];

/**
 * Last result of `pendingVerificationsFor`, kept so the same call returns the
 * same array.
 *
 * `useSyncExternalStore` compares snapshots by identity. Deriving a fresh array
 * on every call makes React believe the store changed on every render, and the
 * monitor took the whole screen down with "maximum update depth exceeded".
 * `items` is replaced wholesale on every mutation, so its reference is a sound
 * cache key.
 */
let derived: {
  items: PendingVerification[];
  companyId: string;
  result: PendingVerification[];
} | null = null;

/**
 * Everything still owed for one company, newest first.
 *
 * Feeds the monitor on the Subscription screen. Until this existed the queue
 * was observable only through a debugger, so a purchase stuck against a
 * misconfigured server produced one sentence of copy and nothing anybody could
 * act on or quote to support.
 */
export function pendingVerificationsFor(
  companyId: string | null | undefined,
): PendingVerification[] {
  if (!companyId) return NO_VERIFICATIONS;
  if (derived && derived.items === items && derived.companyId === companyId) {
    return derived.result;
  }

  const result = items
    .filter((item) => item.companyId === companyId)
    .sort((left, right) => right.firstSeenAt - left.firstSeenAt);

  derived = { items, companyId, result: result.length === 0 ? NO_VERIFICATIONS : result };
  return derived.result;
}

/**
 * A paid purchase the server has not acknowledged.
 *
 * Used by the entitlement resolver to let StoreKit's own view outrank a remote
 * `free`, so it counts the in-flight first attempt too — that is exactly the
 * window in which a paying user would otherwise be shown the paywall.
 */
export function hasPendingVerification(companyId: string | null | undefined): boolean {
  if (!companyId) return false;
  return items.some((item) => item.companyId === companyId);
}

/**
 * A purchase that has already failed verification at least once.
 *
 * This is the UI-facing question. The normal path spends about a second in the
 * queue, and telling every buyer "we are still confirming your payment" for
 * that second would be noise, not honesty.
 */
export function hasFailedVerification(companyId: string | null | undefined): boolean {
  if (!companyId) return false;
  return items.some((item) => item.companyId === companyId && item.attempts >= 1);
}

/**
 * Why the last attempt failed, when the answer is one waiting will not change.
 *
 * The queue retries everything the same way, which is right — but the *copy*
 * must not be the same for everything. "We are still recording it, nothing to
 * do" is true of a dropped connection and false of a server missing its App
 * Store credentials, and telling a paying customer to sit tight through the
 * second is how this stayed invisible.
 */
export function permanentVerificationFailure(
  companyId: string | null | undefined,
): 'server_unconfigured' | 'permission_denied' | null {
  if (!companyId) return null;
  for (const item of items) {
    if (item.companyId !== companyId || item.attempts < 1) continue;
    if (item.lastError === 'server_unconfigured') return 'server_unconfigured';
    if (item.lastError === 'permission_denied') return 'permission_denied';
  }
  return null;
}

/**
 * Record a paid transaction before its first verification is sent.
 *
 * Deliberately not "enqueue on failure". A request that never returns — a hung
 * socket, the process being killed while the sheet dismisses — produces no
 * error to catch, and a purchase known only to a `try` block that never
 * finished is a purchase that was silently lost. Written first, removed on
 * success: the only state that survives is the one the server has not seen.
 */
export function trackVerification(input: {
  transactionId: string;
  productId: string;
  companyId: string;
  appAccountToken?: string | null;
}): void {
  if (items.some((item) => item.transactionId === input.transactionId)) return;

  items = [
    ...items,
    {
      transactionId: input.transactionId,
      productId: input.productId,
      companyId: input.companyId,
      appAccountToken: input.appAccountToken ?? null,
      attempts: 0,
      firstSeenAt: Date.now(),
      lastAttemptAt: Date.now(),
      lastError: null,
    },
  ];
  persist();
}

/** One more failed round-trip: pushes the entry further down its backoff. */
export function markVerificationFailed(transactionId: string, error: string | null): void {
  let changed = false;
  items = items.map((item) => {
    if (item.transactionId !== transactionId) return item;
    changed = true;
    return {
      ...item,
      attempts: item.attempts + 1,
      lastAttemptAt: Date.now(),
      lastError: error ?? item.lastError,
    };
  });
  if (changed) persist();
}

export function resolveVerification(transactionId: string): void {
  const next = items.filter((item) => item.transactionId !== transactionId);
  if (next.length === items.length) return;
  items = next;
  persist();
}

/** Drop everything for a company — sign-out, or a workspace that changed hands. */
export function clearVerificationsFor(companyId: string): void {
  const next = items.filter((item) => item.companyId !== companyId);
  if (next.length === items.length) return;
  items = next;
  persist();
}

export function clearAllVerifications(): void {
  if (items.length === 0) return;
  items = [];
  persist();
}

/**
 * Entries whose backoff has elapsed. Retrying every one on every foreground
 * would hammer a server that is, in the common case, simply not configured yet.
 */
export function dueVerifications(companyId: string, now = Date.now()): PendingVerification[] {
  return items.filter((item) => item.companyId === companyId && isVerificationDue(item, now));
}
