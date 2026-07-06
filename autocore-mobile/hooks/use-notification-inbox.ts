import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { NotificationService } from '@/services/notifications';
import type { NotificationInboxState, NotificationRecord } from '@/types/notifications';
import { useNotificationStore } from '@/stores/notification-store';

/** Inbox hook — delegates to NotificationService. */
export function useNotificationInbox(
  _filter: 'active' | 'unread' | NotificationInboxState = 'active',
) {
  const items = useNotificationStore((s) => s.items);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const loading = useNotificationStore((s) => s.loading);
  const syncing = useNotificationStore((s) => s.syncing);
  const error = useNotificationStore((s) => s.error);

  useEffect(() => {
    if (!loading && items.length === 0) {
      void NotificationService.syncInbox();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void NotificationService.syncInbox();
    }, []),
  );

  const refresh = useCallback(async () => {
    await NotificationService.syncInbox();
  }, []);

  const markRead = useCallback(async (notificationId: string) => {
    await NotificationService.markRead(notificationId);
  }, []);

  const archive = useCallback(async (notificationId: string) => {
    await NotificationService.delete(notificationId);
  }, []);

  const dismiss = useCallback(async (notificationId: string) => {
    await NotificationService.dismiss(notificationId);
  }, []);

  const markAllRead = useCallback(async () => {
    await NotificationService.markAllRead();
  }, []);

  const serverItems: NotificationRecord[] = items
    .filter((n) => n.source === 'server')
    .map((n) => ({
      id: n.serverId ?? n.id,
      userId: '',
      companyId: '',
      eventType: n.type,
      category: 'system' as const,
      priority: 'medium' as const,
      title: n.title,
      body: n.message,
      state: n.read ? ('read' as const) : ('unread' as const),
      deepLink: n.deepLink,
      channelsDelivered: ['inbox' as const],
      createdAt: n.createdAt,
    }));

  return {
    items: serverItems.length > 0 ? serverItems : items.map((n) => ({
      id: n.id,
      userId: '',
      companyId: '',
      eventType: n.type,
      category: 'system' as const,
      priority: 'medium' as const,
      title: n.title,
      body: n.message,
      state: n.read ? ('read' as const) : ('unread' as const),
      deepLink: n.deepLink,
      channelsDelivered: ['inbox' as const],
      createdAt: n.createdAt,
    })),
    unreadCount,
    loading,
    refreshing: syncing,
    error,
    refresh,
    markRead,
    archive,
    dismiss,
    markAllRead,
  };
}
