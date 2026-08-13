import type { SFSymbol } from 'sf-symbols-typescript';

import type { ShellTabId } from '@/lib/shell/types';

export type TabSpec = {
  /** Expo route name under `app/(tabs)`. */
  route: string;
  /** Stable shell identity — never grows with modules. */
  shellId: ShellTabId;
  label: string;
  sf: { default: SFSymbol; selected: SFSymbol };
  /**
   * When true, pressing the tab opens the Action sheet instead of navigating
   * (the route still exists as a lightweight placeholder).
   */
  isAction?: boolean;
};

/**
 * Autocore dock — Home · Work · (+) · Finance · Settings.
 * Modules change content inside these slots, never the bar itself.
 */
export const TAB_SPECS: TabSpec[] = [
  {
    route: 'index',
    shellId: 'home',
    label: 'Home',
    sf: { default: 'house', selected: 'house.fill' },
  },
  {
    route: 'work',
    shellId: 'work',
    label: 'Work',
    sf: { default: 'square.stack.3d.up', selected: 'square.stack.3d.up.fill' },
  },
  {
    route: 'action',
    shellId: 'action',
    label: 'Action',
    sf: { default: 'plus', selected: 'plus' },
    isAction: true,
  },
  {
    route: 'accounting',
    shellId: 'finance',
    label: 'Finance',
    sf: { default: 'chart.bar', selected: 'chart.bar.fill' },
  },
  {
    route: 'profile',
    shellId: 'profile',
    label: 'Settings',
    // Outline only — filled gear reads too heavy next to quieter tab glyphs.
    sf: { default: 'gearshape', selected: 'gearshape' },
  },
];

/** Bar order for shell tabs. */
export const TAB_ROUTE_ORDER: string[] = TAB_SPECS.map((spec) => spec.route);

/**
 * Legacy / drill-in routes that still live under `(tabs)` but are hidden from
 * the dock. Reached from Work, Action, Search, or deep links.
 */
export const HIDDEN_TAB_ROUTES = new Set(['orders', 'scan', 'ai']);

/**
 * App screens that live at the root instead of in the tab group — reached by
 * pushing, never by a tab.
 */
export const ROOT_APP_ROUTES = new Set([
  'search',
  'warehouse',
  'import',
  'intake',
  'objects',
]);
