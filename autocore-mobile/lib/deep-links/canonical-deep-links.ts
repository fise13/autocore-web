/**
 * One canonical URL space shared by web and iOS.
 *
 * `https://app.myautocore.com/work-orders/123` names the same resource on both
 * clients, so a single table maps a canonical web path onto the Expo Router
 * route that renders it. Universal Links, push payloads and in-app links all
 * come through here — there is no second routing table anywhere.
 *
 * Pure module: no React, no expo-router, no react-native. It is unit tested
 * with `node --test` and must stay importable outside the app runtime.
 */

export const CANONICAL_APP_HOST = 'app.myautocore.com';
export const CANONICAL_MARKETING_HOST = 'myautocore.com';
export const APP_SCHEME = 'autocoremobile';

/** Hosts whose HTTPS links this app claims. `www.` variants normalize away. */
const CANONICAL_HOSTS = new Set([CANONICAL_APP_HOST, CANONICAL_MARKETING_HOST]);

export type DeepLinkTarget = {
  /** Expo Router route pattern, e.g. `/orders/[id]`. */
  pathname: string;
  /** Route params plus any forwarded query string values. */
  params: Record<string, string>;
  /**
   * `false` only for invite/join, which have to work before sign-in.
   * Everything else waits for the session and never bypasses the auth gate.
   */
  requiresAuth: boolean;
};

/** Where an unmapped in-app URL lands. Never `+not-found`, never a crash. */
export const DEEP_LINK_HOME: DeepLinkTarget = {
  pathname: '/(tabs)',
  params: {},
  requiresAuth: true,
};

/**
 * Canonical paths the app deliberately does NOT claim: browser-owned flows
 * (OAuth handlers, PDF render routes) and marketing pages. Listing them here
 * keeps `apple-app-site-association` and the resolver honest about each other.
 */
const NEVER_CLAIMED_PREFIXES = [
  '/login',
  '/auth',
  '/demo',
  '/deck',
  '/api',
  '/render',
  '/documents',
  '/migration',
  '/warranty',
  '/.well-known',
  '/product',
  '/modules',
  '/pricing',
  '/security',
  '/contact',
  '/legal',
  '/marketing',
] as const;

export function isNeverClaimedPath(path: string): boolean {
  const normalized = normalizePath(path);
  return NEVER_CLAIMED_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

/** `/Work-Orders/123/` → `/work-orders/123`. Route segments only — ids keep case. */
function normalizePath(path: string): string {
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  const trimmed = withSlash.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return trimmed || '/';
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    // Malformed percent-encoding (`%zz`) — keep the raw segment rather than throw.
    return segment;
  }
}

/**
 * Route segments are matched case-insensitively (iOS pastes and QR codes love
 * to change case); dynamic ids keep their exact bytes because Firestore ids are
 * case sensitive.
 */
function segmentsOf(path: string): { raw: string[]; lower: string[] } {
  const raw = normalizePath(path).split('/').filter(Boolean).map(decodeSegment);
  return { raw, lower: raw.map((segment) => segment.toLowerCase()) };
}

export type ParsedCanonicalUrl = {
  path: string;
  query: Record<string, string>;
};

/**
 * Accepts a full canonical URL, an `autocoremobile://` URL, or a bare path.
 * Returns `null` when the URL belongs to someone else (Google sign-in
 * callbacks, Expo dev-client URLs, `exp://` …) so callers leave it alone.
 */
export function parseCanonicalUrl(input: string): ParsedCanonicalUrl | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/')) {
    return splitPathAndQuery(trimmed);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return null;
    }
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!CANONICAL_HOSTS.has(host)) return null;
    return {
      path: normalizePath(url.pathname),
      query: queryRecord(url.searchParams),
    };
  }

  const schemePrefix = `${APP_SCHEME}://`;
  if (trimmed.toLowerCase().startsWith(schemePrefix)) {
    return splitPathAndQuery(trimmed.slice(schemePrefix.length));
  }

  return null;
}

function splitPathAndQuery(value: string): ParsedCanonicalUrl {
  const withoutFragment = value.split('#')[0] ?? '';
  const queryStart = withoutFragment.indexOf('?');
  const rawPath = queryStart >= 0 ? withoutFragment.slice(0, queryStart) : withoutFragment;
  const rawQuery = queryStart >= 0 ? withoutFragment.slice(queryStart + 1) : '';
  return {
    path: normalizePath(rawPath),
    query: queryRecord(new URLSearchParams(rawQuery)),
  };
}

function queryRecord(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    // Last value wins, matching how Expo Router collapses repeated params.
    out[key] = value;
  });
  return out;
}

/** Query keys the app never forwards into route params. */
const STRIPPED_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'id_token',
  'refresh_token',
  'idtoken',
  'accesstoken',
  'auth',
  'session',
  'password',
  'secret',
  'code',
  'apikey',
  'api_key',
]);

/**
 * Credentials must never ride a deep link into app state. `/invite/[token]`
 * keeps its path segment (that is an invitation id, redeemed server side), but
 * anything credential-shaped in the query is dropped before navigation.
 */
export function stripSensitiveQuery(
  query: Record<string, string>,
  keep: readonly string[] = [],
): Record<string, string> {
  const keepSet = new Set(keep);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (keepSet.has(key)) {
      out[key] = value;
      continue;
    }
    if (STRIPPED_QUERY_KEYS.has(key.toLowerCase())) continue;
    out[key] = value;
  }
  return out;
}

type Matcher = (
  segments: { raw: string[]; lower: string[] },
  query: Record<string, string>,
) => DeepLinkTarget | null;

function target(
  pathname: string,
  params: Record<string, string>,
  requiresAuth = true,
): DeepLinkTarget {
  return { pathname, params, requiresAuth };
}

/**
 * Canonical path → Expo Router route. Keep in sync with
 * `src/lib/mobile/universal-links.ts`, which turns the same list into the
 * `apple-app-site-association` components the phone downloads.
 */
const MATCHERS: Matcher[] = [
  // Public — must resolve before a session exists.
  ({ raw, lower }, query) => {
    if (lower[0] !== 'invite' || !raw[1]) return null;
    return target('/invite/[token]', { token: raw[1], ...stripSensitiveQuery(query) }, false);
  },
  ({ lower }, query) =>
    lower[0] === 'join' && lower.length === 1
      ? target('/join', stripSensitiveQuery(query, ['token', 'invite']), false)
      : null,

  // Overview.
  ({ lower }) => (lower.length === 0 ? DEEP_LINK_HOME : null),

  // Work orders. Web has the list and `[id]`; nothing deeper exists on either
  // client, so nothing deeper is claimed.
  ({ raw, lower }, query) => {
    if (lower[0] !== 'work-orders') return null;
    if (lower.length === 1) return target('/orders', stripSensitiveQuery(query));
    return target('/orders/[id]', { id: raw[1], ...stripSensitiveQuery(query) });
  },

  ({ lower }, query) =>
    lower[0] === 'warehouse' ? target('/warehouse', stripSensitiveQuery(query)) : null,

  // Serialized motors → mobile "objects" hub. Web has no motor detail route,
  // so neither side claims `/motors/{id}`.
  ({ lower }, query) =>
    lower[0] === 'motors' ? target('/objects/engines', stripSensitiveQuery(query)) : null,

  ({ lower }, query) => {
    if (lower[0] !== 'engine-intake') return null;
    const stripped = stripSensitiveQuery(query);
    if (stripped.new === '1') return target('/objects/new', {});
    const filter = stripped.filter === 'all' ? 'all' : 'incoming';
    return target('/objects/engines', { ...stripped, filter });
  },

  ({ lower }, query) =>
    lower[0] === 'accounting' ? target('/(tabs)/accounting', stripSensitiveQuery(query)) : null,

  ({ lower }, query) =>
    lower[0] === 'my-earnings' ? target('/earnings', stripSensitiveQuery(query)) : null,

  ({ lower }, query) =>
    lower[0] === 'team' ? target('/(tabs)/profile/team', stripSensitiveQuery(query)) : null,

  ({ lower }, query) =>
    lower[0] === 'settings' && lower.length === 1
      ? target('/(tabs)/profile', stripSensitiveQuery(query))
      : null,

  ({ lower }, query) => (lower[0] === 'ai' ? target('/(tabs)/ai', stripSensitiveQuery(query)) : null),

  // Imports. `/imports/{jobId}` is a job, not a batch — it must not be read as
  // a batchId, which is why only the explicit batch shapes pass an id through.
  ({ raw, lower }, query) => {
    if (lower[0] !== 'imports' && lower[0] !== 'import') return null;
    const batchFromQuery = query.batchId;
    if (lower[1] === 'batch' && raw[2]) {
      return target('/import', { batchId: raw[2] });
    }
    if (batchFromQuery) {
      return target('/import', { batchId: batchFromQuery });
    }
    return target('/import', {});
  },
];

/**
 * Canonical path + query → Expo Router target, or `null` when this app has no
 * screen for it (the link belongs in the browser).
 */
export function matchCanonicalPath(
  path: string,
  query: Record<string, string> = {},
): DeepLinkTarget | null {
  if (isNeverClaimedPath(path)) return null;

  const segments = segmentsOf(path);
  for (const matcher of MATCHERS) {
    const matched = matcher(segments, query);
    if (matched) return matched;
  }
  return null;
}

/**
 * Full resolution used by `+native-intent` and the push resolver.
 *
 * `null` means "not an AutoCore link" — the caller must not navigate.
 * A URL on our hosts that maps to nothing resolves to Home rather than
 * `+not-found`, so an unknown path can never strand or crash the app.
 */
export function resolveCanonicalDeepLink(url: string): DeepLinkTarget | null {
  const parsed = parseCanonicalUrl(url);
  if (!parsed) return null;
  if (isNeverClaimedPath(parsed.path)) return null;
  return matchCanonicalPath(parsed.path, parsed.query) ?? DEEP_LINK_HOME;
}

/** `true` for an HTTPS URL on a host this app claims. */
export function isCanonicalWebUrl(url: string): boolean {
  const trimmed = url?.trim() ?? '';
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const host = new URL(trimmed).hostname.toLowerCase().replace(/^www\./, '');
    return CANONICAL_HOSTS.has(host);
  } catch {
    return false;
  }
}

/** Target → concrete Expo Router path string (`/invite/abc?foo=1`). */
export function deepLinkTargetToPath(link: DeepLinkTarget): string {
  const consumed = new Set<string>();
  const pathname = link.pathname.replace(/\[([^\]]+)\]/g, (_match, key: string) => {
    consumed.add(key);
    return encodeURIComponent(link.params[key] ?? '');
  });

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(link.params)) {
    if (consumed.has(key)) continue;
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Stable identity for dedupe — same screen + same params is the same link. */
export function deepLinkTargetKey(link: DeepLinkTarget): string {
  return deepLinkTargetToPath(link);
}
