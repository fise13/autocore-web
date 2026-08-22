/**
 * Recent activity — what just happened, not a Firestore changelog (IA §10).
 *
 * Work orders are the only domain that currently emits something Home can read
 * honestly, so that is all this returns. Engine and warehouse rows are omitted
 * rather than invented from a document's `updatedAt`, which moves for reasons
 * that are not events.
 *
 * Even here the timestamp is chosen rather than assumed: an order that closed
 * carries `completedAt`, and that is the moment worth printing. Everything else
 * is described as what it is — the last time the record changed — and never
 * dressed up as a named event the data cannot support.
 */
import { coerceToDate } from '@/lib/firestore-timestamp';
import { STATUS_LABELS } from '@/lib/work-order/work-order-utils';
import type { WorkOrder, WorkOrderStatus } from '@/types/work-order';

import { formatActivityTime } from '../../utils/relative-time';
import type { HomeActivityRow } from '../types';

/** Collapsed by default; the expand control reveals the rest. */
export const HOME_ACTIVITY_COLLAPSED = 3;
export const HOME_ACTIVITY_MAX = 20;

const CLOSED_STATUSES: WorkOrderStatus[] = ['completed', 'delivered'];

function statusTone(status: WorkOrderStatus): HomeActivityRow['statusTone'] {
  if (status === 'waiting_parts') return 'warning';
  if (status === 'completed' || status === 'delivered') return 'success';
  if (status === 'cancelled') return 'muted';
  return 'default';
}

/** The moment this row is actually about. */
function eventAt(order: WorkOrder): Date | null {
  if (CLOSED_STATUSES.includes(order.status)) {
    return coerceToDate(order.completedAt) ?? coerceToDate(order.updatedAt) ?? null;
  }
  return coerceToDate(order.updatedAt) ?? null;
}

export function buildHomeActivity(
  orders: WorkOrder[] | null,
  now = new Date(),
  max = HOME_ACTIVITY_MAX,
): HomeActivityRow[] {
  if (!orders) return [];

  return orders
    .map((order) => ({ order, at: eventAt(order) }))
    .filter((entry): entry is { order: WorkOrder; at: Date } => entry.at !== null)
    .sort((left, right) => right.at.getTime() - left.at.getTime())
    .slice(0, max)
    .map(({ order, at }) => ({
      id: order.id,
      title: order.number ? `№${order.number}` : order.id,
      detail: order.vehicleLabel || order.clientName || '—',
      timeLabel: formatActivityTime(at, now),
      statusLabel: STATUS_LABELS[order.status],
      statusTone: statusTone(order.status),
      category: 'order' as const,
      destination: { pathname: `/orders/${order.id}` },
    }));
}
