import type { Href } from 'expo-router';

import { NAV_ITEM_DEFINITIONS } from '../data/navigation-items';
import { resolveVisibleTabs } from '../store/navigation-config-store';
import type { NavItemId } from '../types';

export const NAV_TO_EXPO_TAB: Partial<Record<NavItemId, string>> = {
  mission: 'index',
  search: 'search',
  scan: 'scan',
  orders: 'orders',
  accounting: 'accounting',
  profile: 'profile',
  settings: 'profile',
};

export type TabBarEntry =
  | { kind: 'tab'; expoName: string; navId: NavItemId }
  | { kind: 'more'; items: NavItemId[] };

export function resolveTabBarEntries(
  order: NavItemId[],
  enabled: Record<NavItemId, boolean>,
): TabBarEntry[] {
  const visible = resolveVisibleTabs(order, enabled);
  const entries: TabBarEntry[] = [];

  for (const item of visible) {
    if (item.type === 'more') {
      entries.push({ kind: 'more', items: item.ids });
      continue;
    }
    const expoName = NAV_TO_EXPO_TAB[item.id];
    if (expoName) {
      entries.push({ kind: 'tab', expoName, navId: item.id });
    } else {
      const last = entries[entries.length - 1];
      if (last?.kind === 'more') {
        last.items.push(item.id);
      } else {
        entries.push({ kind: 'more', items: [item.id] });
      }
    }
  }

  return entries;
}

export function getNavItemHref(id: NavItemId): Href | undefined {
  const route = NAV_ITEM_DEFINITIONS[id].route;
  return route as Href | undefined;
}

export function getNavVisual(id: NavItemId) {
  const def = NAV_ITEM_DEFINITIONS[id];
  return {
    label: def.title,
    icon: def.icon,
    emphasized: id === 'scan',
  };
}
