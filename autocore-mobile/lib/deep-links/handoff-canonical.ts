/**
 * Expo Router path → canonical HTTPS URL for Apple Handoff.
 *
 * Handoff publishes `NSUserActivityTypeBrowsingWeb` with `webpageURL` set to
 * the same URL Universal Links already claim. Tauri on Mac only continues
 * browsing-web activities (not a custom activity type), and iOS already
 * routes those URLs through `+native-intent.tsx`. One URL, both directions.
 *
 * Returns `null` when the screen has no claimed web URL (login, engine
 * detail, scan, …) so we do not advertise a page the other device cannot open.
 */

import {
  CANONICAL_APP_HOST,
  isNeverClaimedPath,
  stripSensitiveQuery,
} from './canonical-deep-links';

function firstParam(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0];
  }
  return undefined;
}

function paramsRecord(params: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const text = firstParam(value);
    if (text !== undefined) out[key] = text;
  }
  return out;
}

/** Strip Expo groups so `/(tabs)/accounting` and `/accounting` match. */
export function normalizeExpoPathname(pathname: string): string {
  const stripped = pathname.replace(/\/\([^/]+\)/g, '');
  const withSlash = stripped.startsWith('/') ? stripped : `/${stripped}`;
  const trimmed = withSlash.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return trimmed || '/';
}

const SKIP_PREFIXES = [
  '/login',
  '/forgot-password',
  '/journey',
  '/paywall',
  '/playground',
  '/store-shots',
  '/design-system',
  '/inbox',
  '/search',
  '/scan',
  '/switch-organization',
] as const;

function shouldSkip(path: string): boolean {
  if (isNeverClaimedPath(path)) return true;
  return SKIP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function withQuery(
  path: string,
  query: Record<string, string>,
  keep: readonly string[] = [],
): string {
  const stripped = stripSensitiveQuery(query, keep);
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(stripped)) {
    if (key === 'id' || key === 'batchId') continue;
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Current Expo route → canonical path+query on `app.myautocore.com`, or
 * `null` if this screen must not participate in Handoff.
 */
export function expoPathToCanonicalPath(
  pathname: string,
  params: Record<string, unknown> = {},
): string | null {
  const path = normalizeExpoPathname(pathname);
  if (shouldSkip(path)) return null;

  const p = paramsRecord(params);

  if (path === '/' || path === '/work') return '/';

  if (path === '/orders' || path === '/orders/index') {
    return withQuery('/work-orders', p);
  }
  const orderMatch = path.match(/^\/orders\/([^/]+)$/);
  if (orderMatch) {
    return withQuery(`/work-orders/${orderMatch[1]}`, p);
  }
  if (path.startsWith('/orders/')) return withQuery('/work-orders', p);

  if (path === '/warehouse' || path === '/warehouse/locations') {
    return withQuery('/warehouse', p);
  }

  if (path === '/objects/engines') {
    if (p.filter === 'incoming' || p.filter === 'all') {
      return withQuery('/engine-intake', p);
    }
    return withQuery('/motors', p);
  }
  if (path === '/objects/new') return '/engine-intake?new=1';
  if (path === '/intake' || path.startsWith('/intake/')) {
    return withQuery('/engine-intake', p);
  }

  if (path === '/accounting' || path.startsWith('/accounting/')) {
    return withQuery('/accounting', p);
  }

  if (path === '/earnings' || path === '/my-earnings' || path.startsWith('/earnings/')) {
    return withQuery('/my-earnings', p);
  }

  if (path === '/team' || path === '/profile/team') return withQuery('/team', p);
  if (path === '/profile' || path.startsWith('/profile/')) return withQuery('/settings', p);

  if (path === '/ai') return withQuery('/ai', p);

  if (path === '/import') {
    const batchId = p.batchId;
    if (batchId) return `/imports/batch/${encodeURIComponent(batchId)}`;
    return withQuery('/import', p);
  }

  const inviteMatch = path.match(/^\/invite\/([^/]+)$/);
  if (inviteMatch) return `/invite/${inviteMatch[1]}`;
  if (path === '/join') return withQuery('/join', p, ['token', 'invite']);

  return null;
}

export function expoPathToCanonicalHttps(
  pathname: string,
  params: Record<string, unknown> = {},
): string | null {
  const canonical = expoPathToCanonicalPath(pathname, params);
  if (!canonical) return null;
  return `https://${CANONICAL_APP_HOST}${canonical}`;
}
