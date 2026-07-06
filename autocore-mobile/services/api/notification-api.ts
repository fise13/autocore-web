import type { NotificationPreferences, NotificationRecord } from '@/types/notifications';
import { mobileApi } from '@/services/api/endpoints';
import { mobileFetch, mobileGet, mobilePatch, mobilePost } from '@/services/api/mobile-client';

export type InboxResponse = {
  items: NotificationRecord[];
  unreadCount: number;
};

export type PreferencesResponse = {
  preferences: NotificationPreferences;
};

export function fetchNotificationInbox(state?: 'active' | 'unread' | 'read' | 'archived' | 'dismissed') {
  const query = state ? `?state=${encodeURIComponent(state)}` : '';
  return mobileGet<InboxResponse>(`${mobileApi.notificationsInbox}${query}`);
}

export function fetchNotificationPreferences() {
  return mobileGet<PreferencesResponse>(mobileApi.notificationsPreferences);
}

export function updateNotificationPreferences(patch: Partial<NotificationPreferences>) {
  return mobilePatch<PreferencesResponse>(mobileApi.notificationsPreferences, patch);
}

export function registerNotificationDevice(body: {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  pushToken: string;
  appVersion?: string;
}) {
  return mobilePost<{ ok: boolean }>(mobileApi.notificationsRegisterDevice, body);
}

export function markNotificationState(notificationId: string, state: 'read' | 'archived' | 'dismissed') {
  return mobilePatch<{ ok: boolean }>(mobileApi.notification(notificationId), { state });
}

export function markAllNotificationsRead() {
  return mobilePost<{ updated: number }>(mobileApi.notificationsMarkAllRead);
}

export function backfillTeamNotifications() {
  return mobilePost<{ ok: boolean; created: number; skipped: number; employees: number }>(
    mobileApi.notificationsBackfillTeam,
    {},
  );
}
