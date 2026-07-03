import type { OrdersListMeta } from '../types';

export function formatOrdersHeaderSubtitle(meta: OrdersListMeta): string {
  return `${meta.total} всего · ${meta.openCount} открытых`;
}
