/**
 * Hide the floating tab bar on nested stack screens (order detail, settings, …).
 * Modal overlays (new order, new operation sheet, …) keep the bar visible.
 */
const TAB_ROOTS = new Set([
  '/',
  '/(tabs)',
  '/(tabs)/',
  '/(tabs)/index',
  '/(tabs)/search',
  '/(tabs)/scan',
  '/(tabs)/orders',
  '/(tabs)/accounting',
  '/(tabs)/profile',
  '/search',
  '/scan',
  '/orders',
  '/accounting',
  '/profile',
]);

/** Stack screens presented as modals above the tab bar. */
const TAB_BAR_VISIBLE_NESTED_ROUTES = new Set(['new', '[id]/edit']);

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

function isModalOverlayPath(path: string): boolean {
  return (
    /\/orders\/new$/.test(path) ||
    /\/orders\/[^/]+\/edit$/.test(path) ||
    /\/accounting\/new$/.test(path)
  );
}

/** True when the active tab has a nested stack screen that should hide the tab bar. */
export function isNestedTabStackActive(routes: TabNavRoute[], index: number): boolean {
  const active = routes[index];
  if (!active?.state || typeof active.state.index !== 'number') return false;
  if (active.state.index === 0) return false;

  const deepest = getDeepestActiveRoute(active);
  if (isModalOverlayRoute(deepest.name)) return false;

  return active.state.index > 0;
}

export function shouldHideTabBarFromNavState(routes: TabNavRoute[], index: number): boolean {
  return isNestedTabStackActive(routes, index);
}

export function shouldHideTabBar(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (TAB_ROOTS.has(path) || TAB_ROOTS.has(`${path}/`)) return false;
  if (isModalOverlayPath(path)) return false;

  if (path.includes('/profile/') || path.includes('/orders/')) {
    return true;
  }

  const parts = path.split('/').filter(Boolean).filter((part) => !part.startsWith('('));
  return parts.length > 1;
}
