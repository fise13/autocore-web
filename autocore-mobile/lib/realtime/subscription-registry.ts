import { clearScheduledQueryDataApplies } from '@/lib/realtime/query-data-scheduler';
import { sessionInteractiveQueryKeys } from '@/lib/realtime/session-bootstrap-keys';
import {
  clearRealtimeSnapshots,
  readRealtimeSnapshotSync,
  scheduleRealtimeSnapshotWrite,
} from '@/lib/realtime/snapshot-cache';

type RealtimeError = { code?: string; message: string };

type Subscriber<T> = {
  onData: (data: T) => void;
  onError: (error: RealtimeError) => void;
};

type SubscribeFactory = (
  onData: (data: unknown) => void,
  onError: (error: RealtimeError) => void,
) => () => void;

type RegistryEntry = {
  queryKey: readonly unknown[];
  unsubscribe: () => void;
  subscribers: Set<Subscriber<unknown>>;
  keepAlive: boolean;
  ready: boolean;
  listening: boolean;
  subscribeFactory?: SubscribeFactory;
  lastData?: unknown;
  lastError?: RealtimeError | null;
};

const registry = new Map<string, RegistryEntry>();
const readyListeners = new Set<() => void>();

function notifyReadyListeners(): void {
  for (const listener of readyListeners) {
    listener();
  }
}

function keyOf(queryKey: readonly unknown[]): string {
  return queryKey.map(String).join('|');
}

function applyCachedSnapshot<T>(key: string, cached: T): void {
  const current = registry.get(key);
  if (!current || current.ready) return;
  current.ready = true;
  current.lastData = cached;
  for (const sub of current.subscribers) {
    (sub.onData as (value: T) => void)(cached);
  }
  notifyReadyListeners();
}

function attachListener(entry: RegistryEntry): void {
  if (!entry.subscribeFactory || entry.listening) return;

  entry.unsubscribe = entry.subscribeFactory(
    (data) => {
      const wasReady = entry.ready;
      entry.ready = true;
      entry.lastData = data;
      entry.lastError = null;
      // Defer MMKV stringify/write — sync cache writes starve touches on cold start/resume.
      scheduleRealtimeSnapshotWrite(entry.queryKey, data);
      for (const sub of entry.subscribers) {
        (sub.onData as (value: unknown) => void)(data);
      }
      if (!wasReady) notifyReadyListeners();
    },
    (error) => {
      const wasReady = entry.ready;
      entry.ready = true;
      entry.lastError = error;
      for (const sub of entry.subscribers) {
        sub.onError(error);
      }
      if (!wasReady) notifyReadyListeners();
    },
  );
  entry.listening = true;
}

/** Update an existing live entry from MMKV preload — never creates phantom entries. */
export function seedRealtimeRegistryEntry<T>(queryKey: readonly unknown[], data: T): void {
  const key = keyOf(queryKey);
  const entry = registry.get(key);
  if (!entry) return;

  entry.ready = true;
  entry.lastData = data;
  entry.lastError = null;
  for (const sub of entry.subscribers) {
    (sub.onData as (value: T) => void)(data);
  }

  notifyReadyListeners();
}

/**
 * Shared Firestore/API listeners: one subscription per query key,
 * fan-out to all consumers. Session keep-alive survives screen unmounts.
 */
export function acquireRealtimeSubscription<T>(
  queryKey: readonly unknown[],
  subscribe: (
    onData: (data: T) => void,
    onError: (error: RealtimeError) => void,
  ) => () => void,
  subscriber: Subscriber<T>,
  options?: { keepAlive?: boolean },
): () => void {
  const key = keyOf(queryKey);
  let entry = registry.get(key);

  if (!entry) {
    const subscribers = new Set<Subscriber<unknown>>();
    entry = {
      queryKey,
      unsubscribe: () => undefined,
      subscribers,
      keepAlive: Boolean(options?.keepAlive),
      ready: false,
      listening: false,
      lastError: null,
      subscribeFactory: subscribe as SubscribeFactory,
    };

    const cached = readRealtimeSnapshotSync<T>(queryKey);
    if (cached !== null) {
      entry.ready = true;
      entry.lastData = cached;
    }

    registry.set(key, entry);
    attachListener(entry);

    if (cached !== null) {
      applyCachedSnapshot(key, cached);
    }
  } else {
    entry.subscribeFactory = subscribe as SubscribeFactory;
    if (!entry.listening) {
      attachListener(entry);
    }
  }

  if (options?.keepAlive) {
    entry.keepAlive = true;
  }

  entry.subscribers.add(subscriber as Subscriber<unknown>);

  // Replay last snapshot so late consumers skip loading state.
  if (entry.ready) {
    if (entry.lastError) {
      subscriber.onError(entry.lastError);
    } else if (entry.lastData !== undefined) {
      subscriber.onData(entry.lastData as T);
    }
  }

  return () => {
    const current = registry.get(key);
    if (!current) return;

    current.subscribers.delete(subscriber as Subscriber<unknown>);

    if (current.subscribers.size === 0 && !current.keepAlive) {
      current.unsubscribe();
      current.listening = false;
      registry.delete(key);
    }
  };
}

/** Restart Firestore listeners to pick up changes missed while backgrounded. */
export function reconnectRealtimeSubscriptions(
  queryKeys?: readonly (readonly unknown[])[],
): void {
  const keys = queryKeys?.map(keyOf) ?? [...registry.keys()];
  let delayMs = 0;

  for (const key of keys) {
    const entry = registry.get(key);
    if (!entry?.listening || !entry.subscribeFactory) continue;
    if (!entry.keepAlive && entry.subscribers.size === 0) continue;

    entry.unsubscribe();
    entry.listening = false;

    // Stagger re-attach so first snapshots don't hit the JS thread in one burst.
    const target = entry;
    const wait = delayMs;
    delayMs += 80;
    if (wait === 0) {
      attachListener(target);
    } else {
      setTimeout(() => {
        const current = registry.get(key);
        if (!current || current !== target || current.listening) return;
        attachListener(current);
      }, wait);
    }
  }
}

/** Tear down every shared listener (sign-out or company switch). */
export function clearRealtimeSubscriptions(): void {
  for (const entry of registry.values()) {
    entry.unsubscribe();
  }
  registry.clear();
  clearScheduledQueryDataApplies();
  void clearRealtimeSnapshots();
}

export function isRealtimeReady(queryKey: readonly unknown[]): boolean {
  return registry.get(keyOf(queryKey))?.ready === true;
}

export function areRealtimeKeysReady(queryKeys: readonly (readonly unknown[])[]): boolean {
  return queryKeys.every(isRealtimeReady);
}

/**
 * Interactive shell ready: company config is live/cached, and every acquired
 * interactive listener has delivered its first snapshot. Missing (unsubscribed)
 * keys are ignored so RBAC-gated modules do not block reveal.
 */
export function areInteractiveSessionReady(
  companyId: string,
  interactiveKeys: readonly (readonly unknown[])[],
): boolean {
  const configKey = keyOf(['realtime', 'company-app-config', companyId]);
  const configEntry = registry.get(configKey);
  if (!configEntry?.ready) return false;

  for (const queryKey of interactiveKeys) {
    const entry = registry.get(keyOf(queryKey));
    if (entry && !entry.ready) return false;
  }
  return true;
}

/** True when every keepAlive / subscribed registry entry has its first snapshot. */
export function areAcquiredSessionListenersReady(): boolean {
  let seen = 0;
  for (const entry of registry.values()) {
    if (!entry.keepAlive && entry.subscribers.size === 0) continue;
    seen += 1;
    if (!entry.ready) return false;
  }
  return seen > 0;
}

/**
 * Bootstrap gate: interactive shell keys only (config + work orders / clients /
 * employees). Heavy catalogs may still stream in after reveal.
 */
export function getSessionBootstrapStatus(companyId: string): {
  ready: boolean;
  readyCount: number;
  pendingCount: number;
  configReady: boolean;
} {
  const interactiveKeys = sessionInteractiveQueryKeys(companyId);
  const configReady = isRealtimeReady(['realtime', 'company-app-config', companyId]);
  let readyCount = 0;
  let pendingCount = 0;

  for (const queryKey of interactiveKeys) {
    const entry = registry.get(keyOf(queryKey));
    if (!entry) continue;
    if (!entry.keepAlive && entry.subscribers.size === 0) continue;
    if (entry.ready) readyCount += 1;
    else pendingCount += 1;
  }

  return {
    configReady,
    readyCount,
    pendingCount,
    ready: areInteractiveSessionReady(companyId, interactiveKeys) && readyCount > 0 && pendingCount === 0,
  };
}

export function subscribeRealtimeRegistry(cb: () => void): () => void {
  readyListeners.add(cb);
  return () => {
    readyListeners.delete(cb);
  };
}
