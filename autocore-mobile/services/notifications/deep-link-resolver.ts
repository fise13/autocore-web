import * as Linking from 'expo-linking';
import type { Href } from 'expo-router';

import {
  deepLinkTargetToPath,
  matchCanonicalPath,
  parseCanonicalUrl,
  resolveCanonicalDeepLink,
} from '@/lib/deep-links/canonical-deep-links';
import { resolveInviteHref } from '@/lib/invites/resolve-invite-href';
import { guardedPush } from '@/lib/navigation/guarded-push';
import { parseWidgetDeepLink } from '@/features/live-activity/lib/widget-links';

const SCHEME = 'autocoremobile://';

/**
 * Resolve a notification deep link → Expo Router href.
 *
 * Canonical `https://app.myautocore.com/...` payloads and canonical web paths
 * go through the same table Universal Links use, so a push and a tapped link
 * for the same resource land on the same screen. Expo-native hrefs already in
 * the payload (`/(tabs)/work`, `/orders/{id}`) keep working unchanged.
 */
export function resolveNotificationDeepLink(deepLink?: string | null): Href | null {
  if (!deepLink?.trim()) return null;

  const trimmed = deepLink.trim();

  if (trimmed.startsWith('http')) {
    const canonical = resolveCanonicalDeepLink(trimmed);
    if (canonical) return deepLinkTargetToPath(canonical) as Href;
    // Off-host link (staging, custom domain) — invites still resolve.
    const inviteHref = resolveInviteHref(trimmed);
    if (inviteHref) return inviteHref;
  }

  // `/(group)` prefixes are already Expo Router hrefs, never canonical web paths.
  if (trimmed.startsWith('/') && !trimmed.startsWith('/(')) {
    const parsed = parseCanonicalUrl(trimmed);
    const canonical = parsed ? matchCanonicalPath(parsed.path, parsed.query) : null;
    // No canonical meaning → it is a mobile href already (`/orders/{id}`, `/inbox`).
    if (canonical) return deepLinkTargetToPath(canonical) as Href;
  }

  if (trimmed.startsWith('/(tabs)') || trimmed.startsWith('/')) {
    return trimmed as Href;
  }

  if (!trimmed.startsWith(SCHEME)) {
    return null;
  }

  const path = trimmed.slice(SCHEME.length);

  if (path.startsWith('invite/')) {
    return `/invite/${path.slice('invite/'.length)}` as Href;
  }
  if (path.startsWith('orders/')) {
    return `/orders/${path.slice('orders/'.length)}` as Href;
  }
  if (path === 'orders') return '/orders' as Href;
  if (path === 'earnings' || path.startsWith('earnings/') || path === 'my-earnings') {
    return '/earnings' as Href;
  }
  if (path === 'profile/inbox' || path === 'inbox') {
    return '/inbox' as Href;
  }
  if (path.startsWith('profile/')) {
    return `/(tabs)/profile/${path.slice('profile/'.length)}` as Href;
  }
  if (path === 'scan') return '/(tabs)/scan' as Href;
  if (path === 'work' || path.startsWith('work/') || path.startsWith('work?')) {
    return '/(tabs)/work' as Href;
  }
  if (path.startsWith('accounting')) return '/(tabs)/accounting' as Href;
  if (path.startsWith('search')) return '/search' as Href;
  if (path.startsWith('warehouse')) return '/warehouse' as Href;
  if (path.startsWith('settings/')) {
    return `/(tabs)/profile/${path}` as Href;
  }
  if (path.startsWith('inventory/')) {
    return `/orders/create-item` as Href;
  }
  if (path.startsWith('imports/') || path.startsWith('import/') || path.startsWith('import?')) {
    // Import capture lives at `app/import.tsx` (root stack), not under (tabs).
    const batchMatch = path.match(/[?&]batchId=([^&]+)/);
    if (batchMatch?.[1]) {
      return `/import?batchId=${encodeURIComponent(decodeURIComponent(batchMatch[1]))}` as Href;
    }
    const batchPath = path.match(/^imports\/batch\/([^/?#]+)/);
    if (batchPath?.[1]) {
      return `/import?batchId=${encodeURIComponent(decodeURIComponent(batchPath[1]))}` as Href;
    }
    // `import/{id}` used to be misread as batchId (job id ≠ batch).
    return '/import' as Href;
  }
  if (path === 'sync/conflict') {
    return '/inbox' as Href;
  }
  if (path === 'intake' || path.startsWith('intake/') || path.startsWith('intake?')) {
    const widgetLink = parseWidgetDeepLink(`${SCHEME}${path}`);
    if (widgetLink?.dest === 'intake' && widgetLink.filter) {
      return { pathname: '/intake', params: { filter: widgetLink.filter } } as unknown as Href;
    }
    return '/intake' as Href;
  }

  return '/(tabs)' as Href;
}

export function buildOrderDeepLink(orderId: string): string {
  return `${SCHEME}orders/${orderId}`;
}

export function buildImportDeepLink(_importId?: string): string {
  return `${SCHEME}import`;
}

export function buildImportBatchDeepLink(batchId: string): string {
  return `${SCHEME}import?batchId=${encodeURIComponent(batchId)}`;
}

export async function openNotificationDeepLink(deepLink?: string | null): Promise<boolean> {
  const href = resolveNotificationDeepLink(deepLink);
  if (href) {
    const { router } = await import('expo-router');
    const path =
      typeof deepLink === 'string' && deepLink.startsWith(SCHEME)
        ? deepLink.slice(SCHEME.length)
        : '';
    // Intake bay / Live Activity / widget taps must not stack duplicate `/intake`.
    const widgetLink = parseWidgetDeepLink(deepLink ?? '');
    if (widgetLink?.dest === 'intake') {
      const { openEngineIntakeBay } = await import(
        '@/features/engine-intake/lib/open-engine-intake'
      );
      openEngineIntakeBay(
        router,
        widgetLink.filter ? { filter: widgetLink.filter } : undefined,
      );
      return true;
    }
    if (widgetLink?.dest === 'work') {
      guardedPush(router, '/(tabs)/work' as Href);
      return true;
    }
    // Same rule for the canonical `/engine-intake` link, which resolves to the
    // bay: reuse the existing screen rather than pushing another copy.
    if (
      path === 'intake' ||
      path.startsWith('intake/') ||
      path.startsWith('intake?') ||
      href === '/intake'
    ) {
      const { openEngineIntakeBay } = await import(
        '@/features/engine-intake/lib/open-engine-intake'
      );
      openEngineIntakeBay(router);
      return true;
    }
    guardedPush(router, href);
    return true;
  }
  if (deepLink?.startsWith('http')) {
    await Linking.openURL(deepLink);
    return true;
  }
  return false;
}
