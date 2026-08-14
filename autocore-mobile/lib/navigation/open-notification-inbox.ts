import type { Href } from 'expo-router';

export type NotificationInboxReturnTo =
  | 'overview'
  | 'work'
  | 'accounting'
  | 'search'
  | 'warehouse'
  | 'scan'
  | 'orders'
  | 'earnings'
  | 'notifications'
  | 'hub';

const RETURN_HREFS = {
  // Canonical Home — same as nav-item-availability / action fallback.
  // `/(tabs)/index` is unmatched in Expo Router and lands on +not-found.
  overview: '/(tabs)',
  work: '/(tabs)/work',
  accounting: '/(tabs)/accounting',
  search: '/search',
  warehouse: '/warehouse',
  scan: '/(tabs)/scan',
  orders: '/orders',
  earnings: '/earnings',
  notifications: '/(tabs)/profile/notifications',
  hub: '/(tabs)/profile',
} as const satisfies Record<NotificationInboxReturnTo, string>;

const RETURN_TO_KEYS = new Set<string>(Object.keys(RETURN_HREFS));

/** Profile-stack targets — back() is safe. Cross-tab targets must replace. */
const SAME_STACK_RETURN = new Set<NotificationInboxReturnTo>(['hub', 'notifications']);

export function notificationInboxHref(returnTo: NotificationInboxReturnTo): Href {
  // Root stack (not profile tab) — push/pop slides over the active tab.
  return {
    pathname: '/inbox',
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
  // Unknown / missing → Home, never Profile settings by accident.
  return RETURN_HREFS.overview as Href;
}

export function isSameStackInboxReturn(
  returnTo: string | string[] | undefined,
): boolean {
  const key = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (!key) return false;
  return SAME_STACK_RETURN.has(key as NotificationInboxReturnTo);
}

/** Map the active tab (or profile sub-route) to an inbox back target. */
export function resolveInboxReturnToFromTab(tabName: string | undefined): NotificationInboxReturnTo {
  switch (tabName) {
    case undefined:
    case '':
    case 'index':
    case 'overview':
    case 'mission':
      // Expo often omits `index` from segments on Home — treat as overview.
      return 'overview';
    case 'work':
      return 'work';
    case 'accounting':
    case 'finance':
      return 'accounting';
    case 'action':
      // Action is a sheet, not a destination — return to Home.
      return 'overview';
    case 'ai':
      // AI is no longer a dock tab — fall back to Home.
      return 'overview';
    case 'search':
      return 'search';
    case 'warehouse':
      return 'warehouse';
    case 'scan':
      return 'scan';
    case 'orders':
      return 'orders';
    case 'my-earnings':
    case 'earnings':
      return 'earnings';
    case 'notifications':
      return 'notifications';
    case 'profile':
    case 'hub':
      return 'hub';
    default:
      return 'overview';
  }
}

/**
 * Prefer the concrete screen under the profile stack (e.g. notifications settings)
 * when the bell is pressed from Settings; otherwise use the active tab.
 *
 * Important: Expo Router often reports Home as `(tabs)` without `index`.
 * Never default that to Profile (`hub`) — that sent users to Settings on back.
 */
export function resolveInboxReturnToFromSegments(
  segments: readonly string[],
): NotificationInboxReturnTo {
  const tabsIndex = segments.indexOf('(tabs)');
  if (tabsIndex < 0) {
    if (segments.includes('search')) return 'search';
    if (segments.includes('warehouse')) return 'warehouse';
    if (segments.includes('orders')) return 'orders';
    if (segments.includes('earnings')) return 'earnings';
    return 'overview';
  }

  const tab = segments[tabsIndex + 1];

  if (tab === 'profile') {
    if (segments.includes('notifications')) return 'notifications';
    if (segments.includes('my-earnings')) return 'earnings';
    if (segments.includes('inbox')) return 'hub';
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
