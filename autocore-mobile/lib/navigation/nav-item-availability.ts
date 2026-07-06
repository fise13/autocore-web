import { resolveTabBarEntries, getNavItemHref } from '@/features/settings/lib/tab-bar-integration';
import type { NavItemId } from '@/features/settings/types';
import { isMobileNavItemAllowed } from '@/lib/rbac/navigation-policy';
import type { UserEntity } from '@/types/user';

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
  search: '/(tabs)/search',
  scan: '/(tabs)/scan',
  orders: '/(tabs)/orders',
  accounting: '/(tabs)/accounting',
  profile: '/(tabs)/profile',
  'my-earnings': '/(tabs)/my-earnings',
};

export function resolveNavItemHref(id: NavItemId, expoName?: string): string | null {
  if (expoName && EXPO_TAB_HREFS[expoName]) return EXPO_TAB_HREFS[expoName];
  const custom = getNavItemHref(id);
  return custom ? String(custom) : null;
}

/** First tab-bar destination for this user (respects nav order + RBAC + modules). */
export function resolveInitialTabHref(params: {
  profile: UserEntity | null | undefined;
  navOrder: NavItemId[];
  navEnabled: Record<NavItemId, boolean>;
  modules: NavModuleFlags;
}): string {
  const entries = resolveTabBarEntries(params.navOrder, params.navEnabled);

  for (const entry of entries) {
    if (entry.kind === 'tab') {
      if (!isNavItemVisible(entry.navId, params.profile, params.modules)) continue;
      const href = resolveNavItemHref(entry.navId, entry.expoName);
      if (href) return href;
      continue;
    }

    for (const id of entry.items) {
      if (!isNavItemVisible(id, params.profile, params.modules)) continue;
      const href = resolveNavItemHref(id);
      if (href) return href;
    }
  }

  return '/(tabs)/profile';
}
