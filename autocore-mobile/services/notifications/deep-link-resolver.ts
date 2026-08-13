import * as Linking from 'expo-linking';
import type { Href } from 'expo-router';

import { resolveInviteHref } from '@/lib/invites/resolve-invite-href';
import { guardedPush } from '@/lib/navigation/guarded-push';

const SCHEME = 'autocoremobile://';

/** Resolve notification deep link → Expo Router href. */
export function resolveNotificationDeepLink(deepLink?: string | null): Href | null {
  if (!deepLink?.trim()) return null;

  const trimmed = deepLink.trim();

  if (trimmed.startsWith('http')) {
    const inviteHref = resolveInviteHref(trimmed);
    if (inviteHref) return inviteHref;
  }

  // Web import / batch deep links → mobile import capture
  if (trimmed.startsWith('/import') || trimmed.startsWith('/imports')) {
    try {
      const url = new URL(trimmed, 'https://app.myautocore.com');
      const batchId = url.searchParams.get('batchId');
      if (batchId) {
        return `/(tabs)/import?batchId=${encodeURIComponent(batchId)}` as Href;
      }
      const batchPath = url.pathname.match(/\/imports\/batch\/([^/]+)/);
      if (batchPath?.[1]) {
        return `/(tabs)/import?batchId=${encodeURIComponent(batchPath[1])}` as Href;
      }
    } catch {
      // fall through
    }
    // Legacy `/imports/{jobId}` opens capture — do not treat job id as batchId.
    return '/import' as Href;
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
    return `/(tabs)/orders/${path.slice('orders/'.length)}` as Href;
  }
  if (path === 'orders') return '/(tabs)/orders' as Href;
  if (path === 'profile/inbox' || path === 'inbox') {
    return '/inbox' as Href;
  }
  if (path.startsWith('profile/')) {
    return `/(tabs)/profile/${path.slice('profile/'.length)}` as Href;
  }
  if (path === 'scan') return '/(tabs)/scan' as Href;
  if (path.startsWith('accounting')) return '/(tabs)/accounting' as Href;
  if (path.startsWith('search')) return '/search' as Href;
  if (path.startsWith('warehouse')) return '/warehouse' as Href;
  if (path.startsWith('settings/')) {
    return `/(tabs)/profile/${path}` as Href;
  }
  if (path.startsWith('inventory/')) {
    return `/(tabs)/orders/create-item` as Href;
  }
  if (path.startsWith('imports/') || path.startsWith('import/') || path.startsWith('import?')) {
    const batchMatch = path.match(/[?&]batchId=([^&]+)/);
    if (batchMatch?.[1]) {
      return `/(tabs)/import?batchId=${decodeURIComponent(batchMatch[1])}` as Href;
    }
    const batchPath = path.match(/^imports\/batch\/([^/?#]+)/);
    if (batchPath?.[1]) {
      return `/(tabs)/import?batchId=${decodeURIComponent(batchPath[1])}` as Href;
    }
    // `import/{id}` used to be misread as batchId (job id ≠ batch).
    return '/import' as Href;
  }
  if (path === 'sync/conflict') {
    return '/inbox' as Href;
  }
  if (path === 'intake' || path.startsWith('intake/') || path.startsWith('intake?')) {
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
    // Intake bay / Live Activity taps must not stack duplicate `/intake` screens.
    if (path === 'intake' || path.startsWith('intake/') || path.startsWith('intake?')) {
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
