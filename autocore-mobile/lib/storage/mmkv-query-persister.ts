import { AppState, InteractionManager } from 'react-native';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

import { reviveDatesDeep } from '@/lib/firestore-timestamp';
import { getJson, getString, remove, setJson, setString } from '@/lib/storage/kv';

const RQ_CACHE_KEY = 'autocore-mobile:react-query:v1';
const BUSTER_KEY = 'autocore-mobile:react-query-buster';

let buster = '';
const busterListeners = new Set<() => void>();

function notifyBusterListeners(): void {
  for (const listener of busterListeners) {
    listener();
  }
}

export function getQueryPersistBuster(): string {
  if (buster) return buster;
  buster = getString(BUSTER_KEY) ?? '';
  return buster;
}

export function setQueryPersistBuster(next: string): void {
  if (buster === next) return;
  buster = next;
  if (next) {
    setString(BUSTER_KEY, next);
  } else {
    remove(BUSTER_KEY);
  }
  notifyBusterListeners();
}

export function rotateQueryPersistBuster(): void {
  setQueryPersistBuster(String(Date.now()));
}

export function subscribeQueryPersistBuster(listener: () => void): () => void {
  busterListeners.add(listener);
  return () => busterListeners.delete(listener);
}

/**
 * React Query calls `persistClient` on every cache event. This persister wrote
 * the whole dehydrated cache — every realtime catalog — synchronously each time,
 * so one Firestore update re-serialised megabytes on the JS thread. Writes now
 * coalesce: at most one per window, after interactions, flushed when the app
 * leaves the foreground so nothing is lost.
 */
const PERSIST_WINDOW_MS = 2000;
let pendingClient: PersistedClient | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function flushPendingClient(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  const client = pendingClient;
  pendingClient = null;
  if (client) setJson(RQ_CACHE_KEY, client);
}

AppState.addEventListener('change', (state) => {
  if (state !== 'active') flushPendingClient();
});

export const mmkvQueryPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    pendingClient = client;
    if (persistTimer) return;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      InteractionManager.runAfterInteractions(flushPendingClient);
    }, PERSIST_WINDOW_MS);
  },
  restoreClient: async () => {
    const client = getJson<PersistedClient>(RQ_CACHE_KEY);
    // JSON round-trip turns Date into ISO strings; revive before React Query
    // hydrates screens or `value.getTime()` throws in release.
    return client ? reviveDatesDeep(client) : undefined;
  },
  removeClient: async () => {
    pendingClient = null;
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    remove(RQ_CACHE_KEY);
  },
};
