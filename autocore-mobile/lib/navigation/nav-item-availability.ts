import { getNavItemHref } from '@/features/settings/lib/tab-bar-integration';
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
  search: '/search',
  scan: '/(tabs)/scan',
  orders: '/(tabs)/orders',
  accounting: '/(tabs)/accounting',
  profile: '/(tabs)/profile',
  'my-earnings': '/(tabs)/profile/my-earnings',
};

export function resolveNavItemHref(id: NavItemId, expoName?: string): string | null {
  if (expoName && EXPO_TAB_HREFS[expoName]) return EXPO_TAB_HREFS[expoName];
  const custom = getNavItemHref(id);
  return custom ? String(custom) : null;
}

/** First tab this user can actually open, in bar order. */
export function resolveInitialTabHref(params: {
  profile: UserEntity | null | undefined;
  modules: NavModuleFlags;
}): string {
  for (const spec of TAB_SPECS) {
    if (spec.navId === null) continue;
    if (!isNavItemVisible(spec.navId, params.profile, params.modules)) continue;
    const href = resolveNavItemHref(spec.navId, spec.route);
    if (href) return href;
  }

  return '/(tabs)/profile';
}
