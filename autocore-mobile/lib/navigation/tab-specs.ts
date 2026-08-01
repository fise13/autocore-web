import type { SFSymbol } from 'sf-symbols-typescript';

import type { NavItemId } from '@/features/settings/types';

export type TabSpec = {
  /** Expo route name under `app/(tabs)`. */
  route: string;
  /**
   * Nav item this tab represents, or `null` when the route exists but never
   * belongs in the bar. Native tabs cannot add or remove triggers at runtime,
   * so every route keeps a trigger and only `hidden` changes.
   */
  navId: NavItemId | null;
  label: string;
  sf: { default: SFSymbol; selected: SFSymbol };
  /** iOS 26 gives the search role its own placement, trailing the capsule. */
  role?: 'search';
};

/**
 * The tab bar, in order. Fixed on purpose: this is the app's control centre,
 * and a bar people can rearrange is a bar they have to re-learn. Anything not
 * here is reached from Mission or Settings.
 */
export const TAB_SPECS: TabSpec[] = [
  {
    route: 'index',
    navId: 'mission',
    label: 'Mission',
    sf: { default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' },
  },
  {
    route: 'orders',
    navId: 'orders',
    label: 'Orders',
    sf: { default: 'wrench.and.screwdriver', selected: 'wrench.and.screwdriver.fill' },
  },
  {
    route: 'scan',
    navId: 'scan',
    label: 'Scan',
    sf: { default: 'barcode.viewfinder', selected: 'barcode.viewfinder' },
  },
  {
    route: 'accounting',
    navId: 'accounting',
    label: 'Finance',
    sf: { default: 'chart.bar', selected: 'chart.bar.fill' },
  },
  {
    route: 'profile',
    navId: 'profile',
    label: 'Settings',
    sf: { default: 'person.crop.circle', selected: 'person.crop.circle.fill' },
  },
];

/** Bar order for the tabs a given user can actually see. */
export const TAB_ROUTE_ORDER: string[] = TAB_SPECS.filter((spec) => spec.navId !== null).map(
  (spec) => spec.route,
);

/**
 * App screens that live at the root instead of in the tab group — reached by
 * pushing, never by a tab. They keep the bar at five without being hidden,
 * since a hidden native tab cannot be navigated to at all.
 */
export const ROOT_APP_ROUTES = new Set(['search', 'warehouse', 'import']);
