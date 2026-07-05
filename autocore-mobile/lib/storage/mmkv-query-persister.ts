import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

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

export const mmkvQueryPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    setJson(RQ_CACHE_KEY, client);
  },
  restoreClient: async () => {
    return getJson<PersistedClient>(RQ_CACHE_KEY) ?? undefined;
  },
  removeClient: async () => {
    remove(RQ_CACHE_KEY);
  },
};
