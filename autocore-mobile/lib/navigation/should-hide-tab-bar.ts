/**
 * The floating tab bar stays visible on every tab route.
 * Nested-stack detection is still used so tapping the active tab can pop to root.
 */

/** Stack screens presented as form sheets / modals above the tab content. */
const TAB_BAR_VISIBLE_NESTED_ROUTES = new Set(['new', '[id]/edit', '[id]/index', '[id]']);

type TabNavRoute = {
  key?: string;
  name: string;
  state?: { index?: number; routes?: TabNavRoute[] };
};

function getDeepestActiveRoute(route: TabNavRoute): TabNavRoute {
  let current = route;
  while (current.state?.routes && typeof current.state.index === 'number') {
    const child = current.state.routes[current.state.index];
    if (!child) break;
    current = child;
  }
  return current;
}

function isModalOverlayRoute(routeName: string): boolean {
  return TAB_BAR_VISIBLE_NESTED_ROUTES.has(routeName);
}

/** True when the active tab has a nested stack screen (not a modal overlay). */
export function isNestedTabStackActive(routes: TabNavRoute[], index: number): boolean {
  const active = routes[index];
  if (!active?.state || typeof active.state.index !== 'number') return false;
  if (active.state.index === 0) return false;

  const deepest = getDeepestActiveRoute(active);
  if (isModalOverlayRoute(deepest.name)) return false;

  return active.state.index > 0;
}

/** Tab bar is always shown — nested screens no longer hide it. */
export function shouldHideTabBarFromNavState(_routes: TabNavRoute[], _index: number): boolean {
  return false;
}

/** Tab bar is always shown — nested screens no longer hide it. */
export function shouldHideTabBar(_pathname: string): boolean {
  return false;
}
