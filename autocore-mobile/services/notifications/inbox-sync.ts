import { normalizeCompanyId, isProductionCompanyId } from '@/lib/company-id';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import {
  fetchNotificationInbox,
  markAllNotificationsRead,
  markNotificationState,
} from '@/services/api/notification-api';
import { MobileApiError } from '@/services/api/mobile-client';
import {
  fetchInboxFromFirestore,
  markAllInboxNotificationsRead,
  subscribeInboxFromFirestore,
  updateInboxNotificationState,
} from '@/services/firestore/notification-inbox-repository';
import { getFirebaseAuth } from '@/services/firebase';
import { useAuthStore } from '@/store/auth-store';

import {
  loadInboxCache,
  mergeServerItems,
  paginateItems,
  saveInboxCache,
} from './local-store';
import { fromServerRecord } from './types';
import { getNotificationStore } from '@/stores/notification-store';
import { setBadgeCount } from './push-channel';

function resolveInboxContext(): { userId: string; companyId: string } {
  const auth = useAuthStore.getState();
  const userId = auth.firebaseUser?.uid ?? getFirebaseAuth().currentUser?.uid;
  if (!userId) {
    throw new MobileApiError('Authorization required', 401);
  }

  const companyId =
    resolveSessionCompanyId(auth.profile, auth.memberships) ??
    normalizeCompanyId(auth.profile?.companyId);

  if (!isProductionCompanyId(companyId)) {
    throw new MobileApiError('Join a company first', 403);
  }

  return { userId, companyId };
}

function mapSyncError(error: unknown): MobileApiError {
  if (error instanceof MobileApiError) return error;
  if (error instanceof Error) {
    return new MobileApiError(error.message, 500);
  }
  return new MobileApiError('Failed to load notifications', 500);
}

function applyInboxPayload(items: ReturnType<typeof fromServerRecord>[], unreadCount: number): void {
  const cache = loadInboxCache();
  const merged = mergeServerItems(cache.items, items);
  const nextCache = {
    items: merged,
    unreadCount,
    lastSyncedAt: new Date().toISOString(),
    version: cache.version + 1,
  };
  saveInboxCache(nextCache);

  const store = getNotificationStore();
  const { slice, hasMore } = paginateItems(merged, store.page);
  store.setItems(slice, unreadCount);
  store.setHasMore(hasMore);
  void setBadgeCount(unreadCount);
}

export async function syncInboxFromServer(
  filter: 'active' | 'unread' = 'active',
): Promise<{ items: ReturnType<typeof fromServerRecord>[]; unreadCount: number }> {
  const { userId, companyId } = resolveInboxContext();

  let apiItems: Parameters<typeof fromServerRecord>[0][] = [];
  let firestoreItems: Parameters<typeof fromServerRecord>[0][] = [];

  try {
    const response = await fetchNotificationInbox(filter);
    apiItems = response.items;
  } catch (apiError) {
    if (apiError instanceof MobileApiError && (apiError.status === 401 || apiError.status === 403)) {
      throw apiError;
    }
    if (__DEV__) {
      console.warn('[notifications] API inbox failed, using Firestore only', apiError);
    }
  }

  try {
    const firestoreResponse = await fetchInboxFromFirestore({ userId, companyId, state: filter });
    firestoreItems = firestoreResponse.items;
  } catch (firestoreError) {
    if (__DEV__) {
      console.warn('[notifications] Firestore inbox failed', firestoreError);
    }
  }

  const mergedRecords = new Map<string, Parameters<typeof fromServerRecord>[0]>();
  for (const item of [...apiItems, ...firestoreItems]) {
    mergedRecords.set(item.id, item);
  }

  const serverItems = Array.from(mergedRecords.values())
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(fromServerRecord);

  const unreadCount = serverItems.filter((item) => !item.read).length;
  applyInboxPayload(serverItems, unreadCount);
  return { items: serverItems, unreadCount };
}

export function subscribeInboxRealtime(
  onError?: (error: Error) => void,
): (() => void) | null {
  try {
    const { userId, companyId } = resolveInboxContext();
    return subscribeInboxFromFirestore({
      userId,
      companyId,
      onData: ({ items, unreadCount }) => {
        applyInboxPayload(items.map(fromServerRecord), unreadCount);
      },
      onError: (error) => onError?.(error),
    });
  } catch {
    return null;
  }
}

export async function markServerNotificationRead(id: string): Promise<void> {
  try {
    await markNotificationState(id, 'read');
  } catch (apiError) {
    if (apiError instanceof MobileApiError && apiError.status !== 401 && apiError.status !== 403) {
      await updateInboxNotificationState(id, 'read');
      return;
    }
    throw mapSyncError(apiError);
  }
}

export async function archiveServerNotification(id: string): Promise<void> {
  try {
    await markNotificationState(id, 'archived');
  } catch (apiError) {
    if (apiError instanceof MobileApiError && apiError.status !== 401 && apiError.status !== 403) {
      await updateInboxNotificationState(id, 'archived');
      return;
    }
    throw mapSyncError(apiError);
  }
}

export async function dismissServerNotification(id: string): Promise<void> {
  try {
    await markNotificationState(id, 'dismissed');
  } catch (apiError) {
    if (apiError instanceof MobileApiError && apiError.status !== 401 && apiError.status !== 403) {
      await updateInboxNotificationState(id, 'dismissed');
      return;
    }
    throw mapSyncError(apiError);
  }
}

export async function markAllServerNotificationsRead(): Promise<number> {
  try {
    const result = await markAllNotificationsRead();
    return result.updated;
  } catch (apiError) {
    if (apiError instanceof MobileApiError && apiError.status !== 401 && apiError.status !== 403) {
      const { userId, companyId } = resolveInboxContext();
      return markAllInboxNotificationsRead(userId, companyId);
    }
    throw mapSyncError(apiError);
  }
}
