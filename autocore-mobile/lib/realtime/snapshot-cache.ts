import { reviveDatesDeep } from '@/lib/firestore-timestamp';
import { clearNamespace, getJson, setJson } from '@/lib/storage/kv';
import { ensureAsyncStorageMigrated } from '@/lib/storage/migrate-async-storage';

const STORAGE_PREFIX = 'autocore-mobile:realtime:v1:';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

type CachedRealtimeSnapshot<T> = {
  data: T;
  savedAt: number;
};

function storageKey(queryKey: readonly unknown[]): string {
  return `${STORAGE_PREFIX}${queryKey.map(String).join('|')}`;
}

function isFresh(savedAt: number): boolean {
  return Date.now() - savedAt <= MAX_AGE_MS;
}

export function readRealtimeSnapshotSync<T>(queryKey: readonly unknown[]): T | null {
  const parsed = getJson<CachedRealtimeSnapshot<T>>(storageKey(queryKey));
  if (!parsed || !isFresh(parsed.savedAt)) return null;
  return reviveDatesDeep(parsed.data);
}

export async function readRealtimeSnapshot<T>(queryKey: readonly unknown[]): Promise<T | null> {
  await ensureAsyncStorageMigrated();
  return readRealtimeSnapshotSync<T>(queryKey);
}

export function writeRealtimeSnapshotSync<T>(queryKey: readonly unknown[], data: T): void {
  try {
    const payload: CachedRealtimeSnapshot<T> = {
      data,
      savedAt: Date.now(),
    };
    setJson(storageKey(queryKey), payload);
  } catch {
    // ignore
  }
}

export async function writeRealtimeSnapshot<T>(queryKey: readonly unknown[], data: T): Promise<void> {
  writeRealtimeSnapshotSync(queryKey, data);
}

export async function clearRealtimeSnapshots(): Promise<void> {
  clearNamespace(STORAGE_PREFIX);
}
