import { subscribeCompanySubscription } from '@/services/firestore/billing-repository';
import { isFirebaseConfigured } from '@/services/firebase';
import type { CompanySubscription } from '@/types/billing';

import { readSubscriptionCacheSync, writeSubscriptionCache } from './subscription-cache';

type Subscriber = {
  onData: (subscription: CompanySubscription | null) => void;
  onError: (error: Error) => void;
};

export type SubscriptionSnapshot = {
  subscription: CompanySubscription | null;
  isLoading: boolean;
  error: string | null;
};

/** Stable references for useSyncExternalStore — must not allocate per getSnapshot call. */
const IDLE_SNAPSHOT: SubscriptionSnapshot = {
  subscription: null,
  isLoading: false,
  error: null,
};

const LOADING_SNAPSHOT: SubscriptionSnapshot = {
  subscription: null,
  isLoading: true,
  error: null,
};

type RegistryEntry = {
  unsubscribe: () => void;
  subscribers: Set<Subscriber>;
  subscription: CompanySubscription | null | undefined;
  ready: boolean;
  fromCache: boolean;
  snapshot: SubscriptionSnapshot;
};

const registry = new Map<string, RegistryEntry>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function syncEntrySnapshot(entry: RegistryEntry): void {
  const subscription = entry.subscription ?? null;
  const isLoading = !entry.ready;
  if (entry.snapshot.subscription !== subscription) {
    entry.snapshot.subscription = subscription;
  }
  if (entry.snapshot.isLoading !== isLoading) {
    entry.snapshot.isLoading = isLoading;
  }
  entry.snapshot.error = null;
}

function createEntry(): RegistryEntry {
  return {
    unsubscribe: () => undefined,
    subscribers: new Set(),
    subscription: undefined,
    ready: false,
    fromCache: false,
    snapshot: { subscription: null, isLoading: true, error: null },
  };
}

export function subscribeSubscriptionRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSubscriptionSnapshot(companyId: string | null | undefined): SubscriptionSnapshot {
  if (!companyId || !isFirebaseConfigured()) {
    return IDLE_SNAPSHOT;
  }

  const entry = registry.get(companyId);
  if (!entry) {
    return LOADING_SNAPSHOT;
  }

  syncEntrySnapshot(entry);
  return entry.snapshot;
}

export function acquireCompanySubscription(
  companyId: string,
  subscriber: Subscriber,
): () => void {
  let entry = registry.get(companyId);

  if (!entry) {
    const created = createEntry();

    const cached = readSubscriptionCacheSync(companyId);
    if (cached !== undefined) {
      created.subscription = cached;
      created.ready = true;
      created.fromCache = true;
      syncEntrySnapshot(created);
    }

    created.unsubscribe = subscribeCompanySubscription(
      companyId,
      (next) => {
        const current = registry.get(companyId);
        if (!current) return;
        current.subscription = next;
        current.ready = true;
        current.fromCache = false;
        syncEntrySnapshot(current);
        void writeSubscriptionCache(companyId, next);
        for (const sub of current.subscribers) {
          sub.onData(next);
        }
        notify();
      },
      (error) => {
        const current = registry.get(companyId);
        if (!current) return;
        if (!current.ready) {
          current.ready = true;
          current.subscription = current.subscription ?? null;
          syncEntrySnapshot(current);
          notify();
        }
        for (const sub of current.subscribers) {
          sub.onError(error);
        }
      },
    );

    registry.set(companyId, created);
    entry = created;

    if (created.ready) {
      notify();
    }
  }

  entry.subscribers.add(subscriber);

  if (entry.ready && entry.subscription !== undefined) {
    subscriber.onData(entry.subscription);
  }

  return () => {
    const current = registry.get(companyId);
    if (!current) return;
    current.subscribers.delete(subscriber);
    if (current.subscribers.size === 0) {
      current.unsubscribe();
      registry.delete(companyId);
    }
  };
}

export function clearSubscriptionRegistry(): void {
  for (const entry of registry.values()) {
    entry.unsubscribe();
  }
  registry.clear();
  notify();
}
