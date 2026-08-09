import type { NavItemId } from '@/features/settings/types';
import { isMobileNavItemAllowed } from '@/lib/rbac/navigation-policy';
import type { UserEntity } from '@/types/user';

import { TAB_SPECS } from './tab-specs';

export type NavModuleFlags = {
  workOrders: boolean;
  warehouse: boolean;
  accounting: boolean;
};

export function isNavItemModuleEnabled(
  id: NavItemId,
  modules: NavModuleFlags,
): boolean {
  if (id === 'orders') return modules.workOrders;
  if (id === 'search' || id === 'scan') return modules.warehouse;
  if (id === 'accounting') return modules.accounting;
  return true;
}

export function isNavItemVisible(
  id: NavItemId,
  profile: UserEntity | null | undefined,
  modules: NavModuleFlags,
): boolean {
  return isNavItemModuleEnabled(id, modules) && isMobileNavItemAllowed(profile, id);
}

const EXPO_TAB_HREFS: Record<string, string> = {
  index: '/(tabs)',
  work: '/(tabs)/work',
  action: '/(tabs)/action',
  finance: '/(tabs)/accounting',
  accounting: '/(tabs)/accounting',
  search: '/search',
  scan: '/(tabs)/scan',
  orders: '/(tabs)/orders',
  profile: '/(tabs)/profile',
  'my-earnings': '/(tabs)/profile/my-earnings',
  ai: '/(tabs)/ai',
};

export function resolveNavItemHref(id: NavItemId | string, expoName?: string): string | null {
  if (expoName && EXPO_TAB_HREFS[expoName]) return EXPO_TAB_HREFS[expoName];
  if (id === 'overview' || id === 'home') return '/(tabs)';
  if (id in EXPO_TAB_HREFS) return EXPO_TAB_HREFS[id];
  return null;
}

/** First shell tab — always Home when signed in. */
export function resolveInitialTabHref(_params?: {
  profile: UserEntity | null | undefined;
  modules: NavModuleFlags;
}): string {
  return '/(tabs)';
}

/** Shell tab visibility — dock slots stay stable. */
export function isShellTabVisible(route: string): boolean {
  return TAB_SPECS.some((spec) => spec.route === route);
}
