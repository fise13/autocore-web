import { useCallback, useEffect, useState } from 'react';

import {
  fetchNotificationInbox,
  markAllNotificationsRead,
  markNotificationState,
} from '@/services/api/notification-api';
import type { NotificationInboxState, NotificationRecord } from '@/types/notifications';

export function useNotificationInbox(filter: 'active' | 'unread' | NotificationInboxState = 'active') {
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetchNotificationInbox(filter);
      setItems(response.items);
      setUnreadCount(response.unreadCount);
    } catch {
      setError('Не удалось загрузить уведомления');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = useCallback(async (notificationId: string) => {
    await markNotificationState(notificationId, 'read');
    setItems((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, state: 'read' as const } : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const archive = useCallback(async (notificationId: string) => {
    await markNotificationState(notificationId, 'archived');
    setItems((current) => current.filter((item) => item.id !== notificationId));
  }, []);

  const dismiss = useCallback(async (notificationId: string) => {
    await markNotificationState(notificationId, 'dismissed');
    setItems((current) => current.filter((item) => item.id !== notificationId));
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, state: 'read' as const })));
    setUnreadCount(0);
  }, []);

  return {
    items,
    unreadCount,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    markRead,
    archive,
    dismiss,
    markAllRead,
  };
}
