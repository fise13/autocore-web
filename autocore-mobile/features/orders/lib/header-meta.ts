import type { OrdersListMeta } from '../types';

export function formatOrdersHeaderSubtitle(meta: OrdersListMeta): string {
  return `${meta.openCount} open · ${meta.inProgressCount} in progress · ${meta.closedTodayCount} closed today`;
}
