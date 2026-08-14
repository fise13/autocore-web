/**
 * Deep links widgets and Live Activities use. Pure — no React Native.
 *
 * WidgetKit opens these via `widgetURL`; App Intent buttons send the same
 * strings through `addUserInteractionListener`.
 */
export const WIDGET_SCHEME = 'autocoremobile://';

export type IntakeBayFilter = 'active' | 'ready' | 'all';

export const WIDGET_URL = {
  intake: `${WIDGET_SCHEME}intake`,
  intakeReady: `${WIDGET_SCHEME}intake?filter=ready`,
  intakeActive: `${WIDGET_SCHEME}intake?filter=active`,
  work: `${WIDGET_SCHEME}work`,
  orders: `${WIDGET_SCHEME}orders`,
  warehouse: `${WIDGET_SCHEME}warehouse`,
  scan: `${WIDGET_SCHEME}scan`,
  earnings: `${WIDGET_SCHEME}earnings`,
} as const;

export type WidgetDeepLink =
  | { dest: 'intake'; filter: IntakeBayFilter | null }
  | { dest: 'work' }
  | { dest: 'orders' }
  | { dest: 'warehouse' }
  | { dest: 'scan' }
  | { dest: 'earnings' };

export function parseIntakeBayFilter(
  value: string | null | undefined,
): IntakeBayFilter | null {
  if (value === 'active' || value === 'ready' || value === 'all') return value;
  return null;
}

function queryOf(path: string): URLSearchParams {
  const q = path.indexOf('?');
  return new URLSearchParams(q >= 0 ? path.slice(q + 1) : '');
}

function isHub(path: string, hub: string): boolean {
  return path === hub || path.startsWith(`${hub}?`);
}

/**
 * Widget / Live Activity URLs only. Notification paths with an entity id
 * (`orders/wo_1`, …) stay in `deep-link-resolver.ts`.
 */
export function parseWidgetDeepLink(url: string): WidgetDeepLink | null {
  const trimmed = url.trim();
  if (!trimmed.startsWith(WIDGET_SCHEME)) return null;
  const path = trimmed.slice(WIDGET_SCHEME.length);
  if (isHub(path, 'work') || path.startsWith('work/')) {
    return { dest: 'work' };
  }
  if (isHub(path, 'orders')) {
    return { dest: 'orders' };
  }
  if (isHub(path, 'warehouse')) {
    return { dest: 'warehouse' };
  }
  if (isHub(path, 'scan')) {
    return { dest: 'scan' };
  }
  if (isHub(path, 'earnings') || path === 'my-earnings') {
    return { dest: 'earnings' };
  }
  if (isHub(path, 'intake') || path.startsWith('intake/')) {
    return {
      dest: 'intake',
      filter: parseIntakeBayFilter(queryOf(path).get('filter')),
    };
  }
  return null;
}
