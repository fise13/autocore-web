import type { Href } from 'expo-router';

import {
  navigateNewOrderWithMotor,
  navigateNewOrderWithPart,
} from '@/features/orders/lib/order-composition-nav';

import type { ScanEntityLinkKind } from './classify-payload';

type ScanRouter = {
  push: (href: Href) => void;
  navigate: (href: Href) => void;
};

const ENTITY_LABELS: Record<ScanEntityLinkKind, string> = {
  order: 'Заказ-наряд',
  item: 'Позиция',
  client: 'Клиент',
  shelf: 'Полка',
  location: 'Место',
  invoice: 'Счёт',
  motor: 'Мотор',
};

export function entityLinkLabel(entity: ScanEntityLinkKind): string {
  return ENTITY_LABELS[entity];
}

/**
 * Instant local navigation for AutoCore entity QR codes.
 * No network — destination screens load their own data.
 */
export function openEntityLink(
  entity: ScanEntityLinkKind,
  id: string,
  router: ScanRouter,
): void {
  if (entity === 'order') {
    router.push(`/(tabs)/orders/${id}` as Href);
    return;
  }

  if (entity === 'invoice') {
    router.navigate('/(tabs)/accounting' as Href);
    return;
  }

  if (entity === 'item') {
    navigateNewOrderWithPart(router, id);
    return;
  }

  if (entity === 'motor') {
    navigateNewOrderWithMotor(router, id, 'install');
    return;
  }

  if (entity === 'location' || entity === 'shelf') {
    router.push(`/(tabs)/warehouse/location/${encodeURIComponent(id)}` as Href);
    return;
  }

  // Client — search is the fastest path.
  router.navigate(`/(tabs)/search?q=${encodeURIComponent(id)}` as Href);
}
