import { InteractionManager } from 'react-native';

import { reviveDatesDeep } from '@/lib/firestore-timestamp';
import { likelyExceedsPersistLimit } from '@/lib/realtime/persist-size';
import { clearNamespace, getJson, setString } from '@/lib/storage/kv';
import { ensureAsyncStorageMigrated } from '@/lib/storage/migrate-async-storage';

const STORAGE_PREFIX = 'autocore-mobile:realtime:v1:';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
/** Skip disk persistence for huge catalogs — live RQ + memory are enough. */
const MAX_PERSIST_CHARS = 750_000;

type CachedRealtimeSnapshot<T> = {
  data: T;
  savedAt: number;
};

type PendingWrite = {
  queryKey: readonly unknown[];
  data: unknown;
};

const pendingWrites = new Map<string, PendingWrite>();
const lastDataJsonByKey = new Map<string, string>();
const memoryCache = new Map<string, { data: unknown; savedAt: number }>();
let flushHandle: { cancel: () => void } | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function storageKey(queryKey: readonly unknown[]): string {
  return `${STORAGE_PREFIX}${queryKey.map(String).join('|')}`;
}

function isFresh(savedAt: number): boolean {
  return Date.now() - savedAt <= MAX_AGE_MS;
}

function shouldSkipPersist(queryKey: readonly unknown[]): boolean {
  // Financial ops grow without bound and are the worst stringify offenders.
  return queryKey.includes('financial-operations');
}

function persistSnapshot(key: string, data: unknown): void {
  if (likelyExceedsPersistLimit(data, MAX_PERSIST_CHARS)) {
    lastDataJsonByKey.delete(key);
    return;
  }
  let dataJson: string;
  try {
    dataJson = JSON.stringify(data);
  } catch {
    return;
  }
  if (dataJson.length > MAX_PERSIST_CHARS) {
    // Do not hold a multi-megabyte string in memory just to compare against.
    lastDataJsonByKey.delete(key);
    return;
  }
  if (lastDataJsonByKey.get(key) === dataJson) return;
  lastDataJsonByKey.set(key, dataJson);
  setString(key, `{"data":${dataJson},"savedAt":${Date.now()}}`);
}

function flushOneWrite(): void {
  flushHandle = null;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const next = pendingWrites.values().next();
  if (next.done) {
    flushing = false;
    return;
  }

  flushing = true;
  const item = next.value;
  pendingWrites.delete(storageKey(item.queryKey));

  try {
    if (!shouldSkipPersist(item.queryKey)) {
      persistSnapshot(storageKey(item.queryKey), item.data);
    }
  } catch {
    // ignore
  }

  if (pendingWrites.size === 0) {
    flushing = false;
    return;
  }

  // One MMKV stringify/write per tick — keeps UI responsive during storms.
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushOneWrite();
  }, 40);
}

function scheduleFlush(): void {
  if (flushing || flushHandle || flushTimer) return;

  flushHandle = InteractionManager.runAfterInteractions(() => {
    flushHandle = null;
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushOneWrite();
  });
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (flushHandle) {
      flushHandle.cancel();
      flushHandle = null;
    }
    flushOneWrite();
  }, 80);
}

export function readRealtimeSnapshotSync<T>(queryKey: readonly unknown[]): T | null {
  const key = storageKey(queryKey);
  const cached = memoryCache.get(key);
  if (cached && isFresh(cached.savedAt)) {
    return cached.data as T;
  }

  const parsed = getJson<CachedRealtimeSnapshot<T>>(key);
  if (!parsed || !isFresh(parsed.savedAt)) return null;
  const revived = reviveDatesDeep(parsed.data);
  memoryCache.set(key, { data: revived, savedAt: parsed.savedAt });
  return revived;
}

export async function readRealtimeSnapshot<T>(queryKey: readonly unknown[]): Promise<T | null> {
  await ensureAsyncStorageMigrated();
  return readRealtimeSnapshotSync<T>(queryKey);
}

/** Immediate write — prefer scheduleRealtimeSnapshotWrite on hot snapshot paths. */
export function writeRealtimeSnapshotSync<T>(queryKey: readonly unknown[], data: T): void {
  try {
    const key = storageKey(queryKey);
    memoryCache.set(key, { data, savedAt: Date.now() });
    if (shouldSkipPersist(queryKey)) return;
    persistSnapshot(key, data);
  } catch {
    // ignore
  }
}

/**
 * Queue MMKV persistence off the interaction path.
 * Snapshot handlers stay cheap so UI stays tappable during cold start / resume storms.
 */
export function scheduleRealtimeSnapshotWrite<T>(queryKey: readonly unknown[], data: T): void {
  const key = storageKey(queryKey);
  memoryCache.set(key, { data, savedAt: Date.now() });
  if (shouldSkipPersist(queryKey)) return;
  pendingWrites.set(key, { queryKey, data });
  scheduleFlush();
}

export async function writeRealtimeSnapshot<T>(queryKey: readonly unknown[], data: T): Promise<void> {
  writeRealtimeSnapshotSync(queryKey, data);
}

export async function clearRealtimeSnapshots(): Promise<void> {
  if (flushHandle) {
    flushHandle.cancel();
    flushHandle = null;
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushing = false;
  pendingWrites.clear();
  lastDataJsonByKey.clear();
  memoryCache.clear();
  clearNamespace(STORAGE_PREFIX);
}
