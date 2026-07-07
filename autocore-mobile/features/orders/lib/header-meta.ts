import type { OrdersListMeta } from '../types';

export function formatOrdersHeaderSubtitle(meta: OrdersListMeta): string {
  const free = meta.freeCount ? ` · ${meta.freeCount} свободных` : '';
  return `${meta.total} всего · ${meta.openCount} открытых${free}`;
}
