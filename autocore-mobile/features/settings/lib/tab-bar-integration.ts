import type { Href } from 'expo-router';

import { NAV_ITEM_DEFINITIONS } from '../data/navigation-items';
import type { NavItemId } from '../types';

/**
 * Destination for nav items that are not tabs. The tab bar itself is fixed and
 * lives in `lib/navigation/tab-specs.ts`.
 */
export function getNavItemHref(id: NavItemId): Href | undefined {
  const route = NAV_ITEM_DEFINITIONS[id].route;
  return route as Href | undefined;
}
