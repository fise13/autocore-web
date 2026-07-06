import { FirebaseError } from 'firebase/app';

import { normalizeCompanyId } from '@/lib/company-id';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import { fetchNotificationInbox } from '@/services/api/notification-api';
import { MobileApiError } from '@/services/api/mobile-client';
import {
  fetchInboxFromFirestore,
  markAllInboxNotificationsRead,
  updateInboxNotificationState,
} from '@/services/firestore/notification-inbox-repository';
import { getFirebaseAuth } from '@/services/firebase';
import { useAuthStore } from '@/store/auth-store';

import {
  loadInboxCache,
  mergeServerItems,
  saveInboxCache,
} from './local-store';
import { fromServerRecord } from './types';

function resolveInboxContext(): { userId: string; companyId: string } {
  const auth = useAuthStore.getState();
  const userId = auth.firebaseUser?.uid ?? getFirebaseAuth().currentUser?.uid;
  if (!userId) {
    throw new MobileApiError('Требуется авторизация', 401);
  }

  const companyId =
    resolveSessionCompanyId(auth.profile, auth.memberships) ??
    normalizeCompanyId(auth.profile?.companyId);

  if (!companyId) {
    throw new MobileApiError('Сначала присоединитесь к компании', 403);
  }

  return { userId, companyId };
}

function mapFirestoreError(error: unknown): MobileApiError {
  if (error instanceof MobileApiError) return error;

  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return new MobileApiError('Нет доступа к уведомлениям', 403);
    }
    if (error.code === 'unauthenticated') {
      return new MobileApiError('Требуется авторизация', 401);
    }
    return new MobileApiError(error.message || 'Ошибка Firestore', 500);
  }

  if (error instanceof Error) {
    return new MobileApiError(error.message, 500);
  }

  return new MobileApiError('Не удалось загрузить уведомления', 500);
}

export async function syncInboxFromServer(
  filter: 'active' | 'unread' = 'active',
): Promise<{ items: ReturnType<typeof fromServerRecord>[]; unreadCount: number }> {
  try {
    const { userId, companyId } = resolveInboxContext();

    let response: { items: Parameters<typeof fromServerRecord>[0][]; unreadCount: number };
    try {
      response = await fetchNotificationInbox(filter);
    } catch (apiError) {
      if (apiError instanceof MobileApiError && (apiError.status === 401 || apiError.status === 403)) {
        throw apiError;
      }
      response = await fetchInboxFromFirestore({ userId, companyId, state: filter });
    }

    const serverItems = response.items.map(fromServerRecord);
    const cache = loadInboxCache();
    const merged = mergeServerItems(cache.items, serverItems);

    const nextCache = {
      items: merged,
      unreadCount: response.unreadCount,
      lastSyncedAt: new Date().toISOString(),
      version: cache.version + 1,
    };
    saveInboxCache(nextCache);

    return { items: merged, unreadCount: response.unreadCount };
  } catch (error) {
    throw mapFirestoreError(error);
  }
}

export async function markServerNotificationRead(id: string): Promise<void> {
  try {
    await updateInboxNotificationState(id, 'read');
  } catch (error) {
    throw mapFirestoreError(error);
  }
}

export async function archiveServerNotification(id: string): Promise<void> {
  try {
    await updateInboxNotificationState(id, 'archived');
  } catch (error) {
    throw mapFirestoreError(error);
  }
}

export async function dismissServerNotification(id: string): Promise<void> {
  try {
    await updateInboxNotificationState(id, 'dismissed');
  } catch (error) {
    throw mapFirestoreError(error);
  }
}

export async function markAllServerNotificationsRead(): Promise<number> {
  try {
    const { userId, companyId } = resolveInboxContext();
    return await markAllInboxNotificationsRead(userId, companyId);
  } catch (error) {
    throw mapFirestoreError(error);
  }
}
