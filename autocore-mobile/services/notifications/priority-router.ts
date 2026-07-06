import type { NotificationPreferences } from '@/types/notifications';

import type {
  AppNotificationCategory,
  AppNotificationPriority,
  CategoryChannelPrefs,
  ExtendedCategoryPreferences,
} from './types';
import { DEFAULT_EXTENDED_CATEGORY_PREFS } from './types';

export type DeliveryChannels = {
  push: boolean;
  inApp: boolean;
  activityFeed: boolean;
  toast: boolean;
  local: boolean;
};

const PRIORITY_BASE: Record<AppNotificationPriority, Omit<DeliveryChannels, 'local'>> = {
  critical: { push: true, inApp: true, activityFeed: true, toast: false },
  important: { push: true, inApp: false, activityFeed: true, toast: false },
  normal: { push: false, inApp: false, activityFeed: true, toast: true },
  silent: { push: false, inApp: false, activityFeed: true, toast: false },
};

export function resolveDeliveryChannels(
  priority: AppNotificationPriority,
  category: AppNotificationCategory,
  serverPrefs: NotificationPreferences,
  extendedPrefs: ExtendedCategoryPreferences = DEFAULT_EXTENDED_CATEGORY_PREFS,
  options?: { force?: boolean; skipToast?: boolean },
): DeliveryChannels {
  if (options?.force) {
    return { push: false, inApp: true, activityFeed: true, toast: true, local: false };
  }

  const base = PRIORITY_BASE[priority];
  const catPrefs = extendedPrefs[category] ?? DEFAULT_EXTENDED_CATEGORY_PREFS[category];

  const globalPush = serverPrefs.channels.push;
  const globalInbox = serverPrefs.channels.inbox;
  const globalInApp = serverPrefs.channels.inApp ?? true;

  const serverCategoryEnabled = isServerCategoryEnabled(category, serverPrefs);

  return {
    push: base.push && globalPush && catPrefs.push && serverCategoryEnabled,
    inApp: base.inApp && globalInApp && catPrefs.inApp && serverCategoryEnabled,
    activityFeed: base.activityFeed && globalInbox && catPrefs.activityFeed && serverCategoryEnabled,
    toast: base.toast && !options?.skipToast && serverCategoryEnabled,
    local: false,
  };
}

function isServerCategoryEnabled(
  category: AppNotificationCategory,
  prefs: NotificationPreferences,
): boolean {
  const map: Partial<Record<AppNotificationCategory, keyof NotificationPreferences['categories']>> = {
    order: 'work_orders',
    inventory: 'inventory',
    finance: 'payments',
    team: 'team',
    documents: 'warranty',
    system: 'system',
    subscription: 'system',
    import: 'inventory',
    export: 'inventory',
    sync: 'system',
    ai: 'system',
    security: 'system',
  };

  const serverKey = map[category];
  if (!serverKey) return true;
  return prefs.categories[serverKey] ?? true;
}

/** Sync events never use push. */
export function resolveSyncChannels(): DeliveryChannels {
  return {
    push: false,
    inApp: false,
    activityFeed: false,
    toast: true,
    local: false,
  };
}

/** Live editing warnings: in-app banner only, no push. */
export function resolveLiveEditingChannels(): DeliveryChannels {
  return {
    push: false,
    inApp: true,
    activityFeed: false,
    toast: false,
    local: false,
  };
}

export function mergeCategoryChannelPrefs(
  current: ExtendedCategoryPreferences,
  category: AppNotificationCategory,
  patch: Partial<CategoryChannelPrefs>,
): ExtendedCategoryPreferences {
  return {
    ...current,
    [category]: { ...current[category], ...patch },
  };
}
