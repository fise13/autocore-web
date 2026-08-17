/**
 * Entitlement registry — L4 store.
 *
 * One ref-counted Firestore listener per company, feeding a `useSyncExternalStore`
 * snapshot. Successor to `lib/billing/subscription-registry.ts`.
 *
 * Snapshots are **replaced, not mutated**: `useSyncExternalStore` compares with
 * `Object.is` and bails out of the render when the reference is unchanged, so a
 * mutated-in-place snapshot silently fails to propagate.
 */
import { isFirebaseConfigured } from '@/services/firebase';
import { subscribeCompanySubscription } from '@/services/firestore/billing-repository';
import type { CompanySubscription } from '@/types/billing';

import { devSubscription, subscribeDevMode } from './dev-mode';
import { complimentaryProEntitlement, isPaywallBypassed, subscribePaywallBypass } from './paywall-bypass';
import {
  readEntitlementCacheSync,
  writeEntitlementCache,
  type CachedEntitlement,
} from './entitlement-cache';
import {
  entitlementsEqual,
  resolveEntitlement,
  FREE_ENTITLEMENT,
  type LocalActiveSubscription,
} from './entitlement-resolver';
import type { Entitlement } from './types';

export type EntitlementSnapshot = {
  entitlement: Entitlement;
  isLoading: boolean;
  error: string | null;
};

const IDLE_SNAPSHOT: EntitlementSnapshot = {
  entitlement: FREE_ENTITLEMENT,
  isLoading: false,
  error: null,
};

const LOADING_SNAPSHOT: EntitlementSnapshot = {
  entitlement: FREE_ENTITLEMENT,
  isLoading: true,
  error: null,
};

/**
 * Cache can paint immediately, but AuthGate must not decide paywall vs app
 * until Firestore (or StoreKit error path) has spoken — otherwise a stale
 * free cache flashes the paywall for 1–2s before Pro arrives.
 */
const REMOTE_SETTLE_FAILSAFE_MS = 2_500;

type RegistryEntry = {
  companyId: string;
  unsubscribe: () => void;
  subscribers: number;
  remote: CompanySubscription | null | undefined;
  cached: CachedEntitlement | undefined;
  ready: boolean;
  error: string | null;
  snapshot: EntitlementSnapshot;
  settleTimer: ReturnType<typeof setTimeout> | null;
};

const registry = new Map<string, RegistryEntry>();
const listeners = new Set<() => void>();

/**
 * StoreKit's own view of this device, shared by every entry. It is the last
 * resort in `resolveEntitlement` and is refreshed by the SubscriptionManager.
 */
let localSubscriptions: LocalActiveSubscription[] = [];

function notify(): void {
  for (const listener of listeners) listener();
}

function clearSettleTimer(entry: RegistryEntry): void {
  if (!entry.settleTimer) return;
  clearTimeout(entry.settleTimer);
  entry.settleTimer = null;
}

function markRemoteSettled(entry: RegistryEntry): void {
  clearSettleTimer(entry);
  entry.ready = true;
}

/** Recompute an entry's snapshot; returns true when it actually changed. */
function recompute(entry: RegistryEntry): boolean {
  const entitlement = isPaywallBypassed()
    ? complimentaryProEntitlement(entry.companyId)
    : resolveEntitlement({
        companyId: entry.companyId,
        remote: entry.remote,
        cached: entry.cached,
        local: localSubscriptions,
        devOverride: devSubscription(),
      });

  const isLoading = isPaywallBypassed() ? false : !entry.ready;
  const previous = entry.snapshot;

  if (
    entitlementsEqual(previous.entitlement, entitlement) &&
    previous.isLoading === isLoading &&
    previous.error === entry.error
  ) {
    return false;
  }

  entry.snapshot = { entitlement, isLoading, error: entry.error };
  return true;
}

export function subscribeEntitlementRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Flipping a dev scenario must repaint every subscriber immediately, exactly as
// a server-side change would.
function recomputeAll(): void {
  let changed = false;
  for (const entry of registry.values()) {
    if (recompute(entry)) changed = true;
  }
  if (changed) notify();
}

subscribeDevMode(recomputeAll);
subscribePaywallBypass(recomputeAll);

export function getEntitlementSnapshot(
  companyId: string | null | undefined,
): EntitlementSnapshot {
  if (!companyId || !isFirebaseConfigured()) return IDLE_SNAPSHOT;
  return registry.get(companyId)?.snapshot ?? LOADING_SNAPSHOT;
}

/**
 * Attach (or join) the listener for a company. Returns a release function; the
 * Firestore listener is torn down when the last subscriber leaves.
 */
export function acquireEntitlement(companyId: string): () => void {
  let entry = registry.get(companyId);

  if (!entry) {
    const created: RegistryEntry = {
      companyId,
      unsubscribe: () => undefined,
      subscribers: 0,
      remote: undefined,
      cached: readEntitlementCacheSync(companyId),
      ready: false,
      error: null,
      snapshot: LOADING_SNAPSHOT,
      settleTimer: null,
    };

    // Resolve from cache for paint, but keep isLoading until remote settles.
    recompute(created);

    registry.set(companyId, created);

    created.settleTimer = setTimeout(() => {
      const current = registry.get(companyId);
      if (!current || current.remote !== undefined) return;
      // Network hung — fail open on cache / FREE rather than soft-lock splash.
      current.remote = current.cached?.subscription ?? null;
      markRemoteSettled(current);
      if (recompute(current)) notify();
    }, REMOTE_SETTLE_FAILSAFE_MS);

    created.unsubscribe = subscribeCompanySubscription(
      companyId,
      (next) => {
        const current = registry.get(companyId);
        if (!current) return;
        current.remote = next;
        current.error = null;
        markRemoteSettled(current);
        writeEntitlementCache(companyId, next);
        current.cached = { subscription: next, cachedAt: Date.now() };
        if (recompute(current)) notify();
      },
      (error) => {
        const current = registry.get(companyId);
        if (!current) return;
        // Offline or permission-denied: fall through to cache / StoreKit rather
        // than blocking the UI on a listener that may never arrive.
        current.error = error.message;
        // Treat as settled with remote=null so isLoading clears.
        if (current.remote === undefined) {
          current.remote = current.cached?.subscription ?? null;
        }
        markRemoteSettled(current);
        if (recompute(current)) notify();
      },
    );

    entry = created;
    notify();
  }

  entry.subscribers += 1;

  return () => {
    const current = registry.get(companyId);
    if (!current) return;
    current.subscribers -= 1;
    if (current.subscribers <= 0) {
      clearSettleTimer(current);
      current.unsubscribe();
      registry.delete(companyId);
    }
  };
}

/** Publish StoreKit's local view; recomputes every attached company. */
export function setLocalSubscriptions(next: LocalActiveSubscription[]): void {
  localSubscriptions = next;
  let changed = false;
  for (const entry of registry.values()) {
    if (recompute(entry)) changed = true;
  }
  if (changed) notify();
}

export function getLocalSubscriptions(): LocalActiveSubscription[] {
  return localSubscriptions;
}

/** Current entitlement for a company without subscribing. */
export function peekEntitlement(companyId: string | null | undefined): Entitlement {
  return getEntitlementSnapshot(companyId).entitlement;
}

/** Sign-out teardown — entitlement must never survive into another session. */
export function clearEntitlementRegistry(): void {
  for (const entry of registry.values()) {
    clearSettleTimer(entry);
    entry.unsubscribe();
  }
  registry.clear();
  localSubscriptions = [];
  notify();
}
