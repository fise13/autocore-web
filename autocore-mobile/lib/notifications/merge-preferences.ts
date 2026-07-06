import type { NotificationPreferences } from '@/types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notifications';

export function mergeNotificationPreferences(
  partial?: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  if (!partial) return { ...DEFAULT_NOTIFICATION_PREFERENCES };

  return {
    channels: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.channels,
      ...partial.channels,
      inApp: partial.channels?.inApp ?? DEFAULT_NOTIFICATION_PREFERENCES.channels.inApp,
    },
    categories: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.categories,
      ...partial.categories,
    },
    quietHours: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours,
      ...partial.quietHours,
    },
    emailDigestEnabled:
      partial.emailDigestEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.emailDigestEnabled,
    ...(partial.updatedAt ? { updatedAt: partial.updatedAt } : {}),
  };
}
