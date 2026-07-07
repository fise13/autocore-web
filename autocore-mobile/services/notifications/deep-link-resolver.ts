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
  if (path.startsWith('profile/')) {
    return `/(tabs)/profile/${path.slice('profile/'.length)}` as Href;
  }
  if (path === 'profile/inbox' || path === 'inbox') {
    return '/(tabs)/profile/inbox' as Href;
  }
  if (path === 'scan') return '/(tabs)/scan' as Href;
  if (path.startsWith('accounting')) return '/(tabs)/accounting' as Href;
  if (path.startsWith('search')) return '/(tabs)/search' as Href;
  if (path.startsWith('warehouse')) return '/(tabs)/warehouse' as Href;
  if (path.startsWith('settings/')) {
    return `/(tabs)/profile/${path}` as Href;
  }
  if (path.startsWith('inventory/')) {
    return `/(tabs)/orders/create-item` as Href;
  }
  if (path.startsWith('import/')) {
    return '/(tabs)/profile/inbox' as Href;
  }
  if (path === 'sync/conflict') {
    return '/(tabs)/profile/inbox' as Href;
  }

  return '/(tabs)' as Href;
}

export function buildOrderDeepLink(orderId: string): string {
  return `${SCHEME}orders/${orderId}`;
}

export function buildImportDeepLink(importId: string): string {
  return `${SCHEME}import/${importId}`;
}

export async function openNotificationDeepLink(deepLink?: string | null): Promise<boolean> {
  const href = resolveNotificationDeepLink(deepLink);
  if (href) {
    const { router } = await import('expo-router');
    guardedPush(router, href);
    return true;
  }
  if (deepLink?.startsWith('http')) {
    await Linking.openURL(deepLink);
    return true;
  }
  return false;
}
