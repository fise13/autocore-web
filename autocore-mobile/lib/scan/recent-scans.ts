import type { RecentScan } from '@/features/scan/types';
import { getJson, setJson } from '@/lib/storage/kv';

const STORAGE_KEY = 'scan:recent:v1';
const LEGACY_ASYNC_KEY = '@autocore/scan/recent';
const MAX_RECENT = 20;

type StoredRecentScan = {
  id: string;
  label: string;
  payload: string;
  itemId?: string;
  timestamp: number;
};

let legacyMigratePromise: Promise<StoredRecentScan[]> | null = null;

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function mapStored(item: StoredRecentScan): RecentScan {
  return {
    id: item.id,
    label: item.label,
    time: formatRelativeTime(item.timestamp),
    payload: item.payload,
    itemId: item.itemId,
  };
}

function normalizeStored(raw: unknown): StoredRecentScan[] {
  if (!Array.isArray(raw)) return [];
  const items: StoredRecentScan[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const payload = typeof row.payload === 'string' ? row.payload.trim() : '';
    if (!payload) continue;
    const timestamp =
      typeof row.timestamp === 'number' && Number.isFinite(row.timestamp)
        ? row.timestamp
        : Date.now();
    items.push({
      id: typeof row.id === 'string' ? row.id : `${timestamp}-${payload}`,
      label: typeof row.label === 'string' && row.label.trim() ? row.label.trim() : payload,
      payload,
      itemId: typeof row.itemId === 'string' ? row.itemId : undefined,
      timestamp,
    });
  }
  return items;
}

function mergeRecents(primary: StoredRecentScan[], secondary: StoredRecentScan[]): StoredRecentScan[] {
  const byPayload = new Map<string, StoredRecentScan>();
  for (const item of [...primary, ...secondary]) {
    const prev = byPayload.get(item.payload);
    if (!prev || item.timestamp > prev.timestamp) {
      byPayload.set(item.payload, item);
    }
  }
  return Array.from(byPayload.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_RECENT);
}

function readMmkv(): StoredRecentScan[] {
  return normalizeStored(getJson<unknown>(STORAGE_KEY));
}

async function migrateLegacyIfNeeded(current: StoredRecentScan[]): Promise<StoredRecentScan[]> {
  if (current.length > 0) return current;
  if (legacyMigratePromise) return legacyMigratePromise;

  legacyMigratePromise = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = require('@react-native-async-storage/async-storage').default as {
        getItem: (key: string) => Promise<string | null>;
      };
      const raw = await AsyncStorage.getItem(LEGACY_ASYNC_KEY);
      if (!raw) return readMmkv();
      const legacy = normalizeStored(JSON.parse(raw));
      if (legacy.length === 0) return readMmkv();
      const merged = mergeRecents(readMmkv(), legacy);
      setJson(STORAGE_KEY, merged);
      return merged;
    } catch {
      return readMmkv();
    }
  })();

  return legacyMigratePromise;
}

export async function loadRecentScans(): Promise<RecentScan[]> {
  const stored = await migrateLegacyIfNeeded(readMmkv());
  return stored
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_RECENT)
    .map(mapStored);
}

export async function rememberRecentScan(input: {
  payload: string;
  label: string;
  itemId?: string;
}): Promise<void> {
  const payload = input.payload.trim();
  if (!payload) return;

  const existing = await migrateLegacyIfNeeded(readMmkv());
  const next: StoredRecentScan[] = [
    {
      id: `${Date.now()}-${payload}`,
      label: input.label.trim() || payload,
      payload,
      itemId: input.itemId,
      timestamp: Date.now(),
    },
    ...existing.filter((item) => item.payload !== payload),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_RECENT);

  setJson(STORAGE_KEY, next);
}
