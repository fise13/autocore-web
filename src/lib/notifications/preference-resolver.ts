import type { NotificationCategory, NotificationPreferences } from "@/domain/notifications";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  channels: {
    push: true,
    email: false,
    inbox: true,
  },
  categories: {
    work_orders: true,
    reservations: true,
    warranty: true,
    inventory: true,
    payments: true,
    invoices: true,
    team: true,
    scan: true,
    sales: true,
    system: true,
  },
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 8,
    timezone: "Europe/Moscow",
  },
  emailDigestEnabled: false,
};

export function mergeNotificationPreferences(
  partial?: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  if (!partial) return { ...DEFAULT_NOTIFICATION_PREFERENCES };

  return {
    channels: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.channels,
      ...partial.channels,
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
    updatedAt: partial.updatedAt,
  };
}

export function isCategoryEnabled(
  preferences: NotificationPreferences,
  category: NotificationCategory,
): boolean {
  return preferences.categories[category] !== false;
}

export function isInQuietHours(preferences: NotificationPreferences, at = new Date()): boolean {
  if (!preferences.quietHours.enabled) return false;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: preferences.quietHours.timezone,
    hour: "numeric",
    hour12: false,
  });
  const hour = Number(formatter.format(at));
  const { startHour, endHour } = preferences.quietHours;

  if (startHour === endHour) return false;
  if (startHour < endHour) {
    return hour >= startHour && hour < endHour;
  }
  return hour >= startHour || hour < endHour;
}

export function resolveChannelsForUser(params: {
  preferences: NotificationPreferences;
  priority: "critical" | "high" | "medium" | "low";
  requested: Array<"inbox" | "push" | "badge" | "email">;
  at?: Date;
}): Array<"inbox" | "push" | "badge" | "email"> {
  const { preferences, priority, requested, at } = params;
  const quiet = isInQuietHours(preferences, at);
  const channels = new Set<"inbox" | "push" | "badge" | "email">();

  for (const channel of requested) {
    if (channel === "inbox" && preferences.channels.inbox) {
      channels.add("inbox");
    }
    if (channel === "email" && preferences.channels.email) {
      channels.add("email");
    }
    if (channel === "push" || channel === "badge") {
      if (!preferences.channels.push) continue;
      if (quiet && priority !== "critical") continue;
      channels.add(channel);
    }
  }

  if (priority === "critical") {
    if (preferences.channels.inbox) channels.add("inbox");
    if (preferences.channels.push) channels.add("push");
    channels.add("badge");
  }

  return Array.from(channels);
}
