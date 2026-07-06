import { getJson, setJson } from '@/lib/storage/kv';

import type { AppNotification } from './types';

const CACHE_KEY = 'autocore-mobile:notification-inbox-cache:v1';
const PAGE_SIZE = 30;

export type InboxCache = {
  items: AppNotification[];
  unreadCount: number;
  lastSyncedAt: string | null;
  version: number;
};

const EMPTY_CACHE: InboxCache = {
  items: [],
  unreadCount: 0,
  lastSyncedAt: null,
  version: 0,
};

export function loadInboxCache(): InboxCache {
  return getJson<InboxCache>(CACHE_KEY) ?? { ...EMPTY_CACHE };
}

export function saveInboxCache(cache: InboxCache): void {
  setJson(CACHE_KEY, cache);
}

export function mergeServerItems(
  current: AppNotification[],
  incoming: AppNotification[],
): AppNotification[] {
  const map = new Map<string, AppNotification>();
  for (const item of current) {
    if (item.source === 'local') map.set(item.id, item);
  }
  for (const item of incoming) {
    map.set(item.id, item);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function upsertLocalNotification(
  cache: InboxCache,
  notification: AppNotification,
): InboxCache {
  const existing = cache.items.findIndex((n) => n.id === notification.id);
  const items = [...cache.items];
  if (existing >= 0) {
    items[existing] = notification;
  } else {
    items.unshift(notification);
  }
  const unreadCount = items.filter((n) => !n.read).length;
  return { ...cache, items, unreadCount, version: cache.version + 1 };
}

export function markNotificationReadInCache(cache: InboxCache, id: string): InboxCache {
  const items = cache.items.map((n) => (n.id === id ? { ...n, read: true } : n));
  const unreadCount = items.filter((n) => !n.read).length;
  return { ...cache, items, unreadCount, version: cache.version + 1 };
}

export function markAllReadInCache(cache: InboxCache): InboxCache {
  const items = cache.items.map((n) => ({ ...n, read: true }));
  return { ...cache, items, unreadCount: 0, version: cache.version + 1 };
}

export function removeNotificationFromCache(cache: InboxCache, id: string): InboxCache {
  const items = cache.items.filter((n) => n.id !== id);
  const unreadCount = items.filter((n) => !n.read).length;
  return { ...cache, items, unreadCount, version: cache.version + 1 };
}

export function paginateItems<T>(items: T[], page: number): { slice: T[]; hasMore: boolean } {
  const end = (page + 1) * PAGE_SIZE;
  return {
    slice: items.slice(0, end),
    hasMore: items.length > end,
  };
}

export { PAGE_SIZE as INBOX_PAGE_SIZE };
