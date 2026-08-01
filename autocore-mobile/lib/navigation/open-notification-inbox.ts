import type { Href } from 'expo-router';

export type NotificationInboxReturnTo =
  | 'mission'
  | 'search'
  | 'warehouse'
  | 'scan'
  | 'orders'
  | 'accounting'
  | 'earnings'
  | 'notifications'
  | 'hub';

const RETURN_HREFS = {
  mission: '/(tabs)/index',
  search: '/search',
  warehouse: '/warehouse',
  scan: '/(tabs)/scan',
  orders: '/(tabs)/orders',
  accounting: '/(tabs)/accounting',
  earnings: '/(tabs)/profile/my-earnings',
  notifications: '/(tabs)/profile/notifications',
  hub: '/(tabs)/profile',
} as const satisfies Record<NotificationInboxReturnTo, string>;

const RETURN_TO_KEYS = new Set<string>(Object.keys(RETURN_HREFS));

export function notificationInboxHref(returnTo: NotificationInboxReturnTo): Href {
  return {
    pathname: '/(tabs)/profile/inbox',
    params: { returnTo },
  } as Href;
}

export function resolveNotificationInboxReturnHref(
  returnTo: string | string[] | undefined,
): Href {
  const key = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (key && RETURN_TO_KEYS.has(key)) {
    return RETURN_HREFS[key as NotificationInboxReturnTo] as Href;
  }
  return RETURN_HREFS.hub as Href;
}

/** Map the active tab (or profile sub-route) to an inbox back target. */
export function resolveInboxReturnToFromTab(tabName: string | undefined): NotificationInboxReturnTo {
  switch (tabName) {
    case 'index':
    case 'mission':
      return 'mission';
    case 'search':
      return 'search';
    case 'warehouse':
      return 'warehouse';
    case 'scan':
      return 'scan';
    case 'orders':
      return 'orders';
    case 'accounting':
      return 'accounting';
    case 'my-earnings':
    case 'earnings':
      return 'earnings';
    case 'notifications':
      return 'notifications';
    case 'profile':
    case 'hub':
      return 'hub';
    default:
      return 'hub';
  }
}

/**
 * Prefer the concrete screen under the profile stack (e.g. notifications settings)
 * when the bell is pressed from Settings; otherwise use the active tab.
 */
export function resolveInboxReturnToFromSegments(
  segments: readonly string[],
): NotificationInboxReturnTo {
  const tabsIndex = segments.indexOf('(tabs)');
  const tab = tabsIndex >= 0 ? segments[tabsIndex + 1] : undefined;

  if (tab === 'profile') {
    if (segments.includes('notifications')) return 'notifications';
    return 'hub';
  }

  return resolveInboxReturnToFromTab(tab);
}

type OpenInboxRouter = {
  push: (href: Href) => void;
};

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
