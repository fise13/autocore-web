import type { Href } from 'expo-router';

export type NotificationInboxReturnTo = 'mission' | 'notifications' | 'hub';

const RETURN_HREFS = {
  mission: '/(tabs)/index',
  notifications: '/(tabs)/profile/notifications',
  hub: '/(tabs)/profile',
} as const satisfies Record<NotificationInboxReturnTo, string>;

export function notificationInboxHref(returnTo: NotificationInboxReturnTo): Href {
  return `/(tabs)/profile/inbox?returnTo=${returnTo}` as Href;
}

export function resolveNotificationInboxReturnHref(
  returnTo: string | string[] | undefined,
): Href {
  const key = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (key === 'mission' || key === 'notifications' || key === 'hub') {
    return RETURN_HREFS[key] as Href;
  }
  return RETURN_HREFS.hub as Href;
}

type OpenInboxRouter = {
  push: (href: Href) => void;
};

export function resolveInboxReturnToFromTab(_tabName: string | undefined): NotificationInboxReturnTo {
  return 'hub';
}

/** Opens inbox with an explicit back target — avoids broken cross-tab history. */
export function openNotificationInbox(
  router: OpenInboxRouter,
  options: {
    currentTab?: string;
    returnTo?: NotificationInboxReturnTo;
  },
): void {
  const returnTo = options.returnTo ?? resolveInboxReturnToFromTab(options.currentTab);
  router.push(notificationInboxHref(returnTo));
}
