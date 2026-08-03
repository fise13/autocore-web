import type { WorkOrder } from '../types';

export type OrderRowPosition = 'only' | 'first' | 'middle' | 'last';

export type OrdersRow =
  | { kind: 'header'; id: string; label: string; count: number }
  | {
      kind: 'order';
      id: string;
      order: WorkOrder;
      index: number;
      position: OrderRowPosition;
    };

function positionInGroup(index: number, length: number): OrderRowPosition {
  if (length === 1) return 'only';
  if (index === 0) return 'first';
  if (index === length - 1) return 'last';
  return 'middle';
}

export type OrdersSection = {
  id: string;
  label: string;
  count: number;
  orders: WorkOrder[];
};

type Bucket = 'today' | 'yesterday' | 'earlier';

const BUCKET_LABEL: Record<Bucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

const BUCKET_ORDER: Bucket[] = ['today', 'yesterday', 'earlier'];

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function bucketFor(updatedAtMs: number | undefined, now: Date): Bucket {
  if (!updatedAtMs) return 'earlier';
  const today = startOfDay(now);
  if (updatedAtMs >= today) return 'today';
  if (updatedAtMs >= today - 86_400_000) return 'yesterday';
  return 'earlier';
}

function partitionBuckets(orders: WorkOrder[], now: Date): Record<Bucket, WorkOrder[]> {
  const buckets: Record<Bucket, WorkOrder[]> = { today: [], yesterday: [], earlier: [] };
  for (const order of orders) {
    buckets[bucketFor(order.updatedAtMs, now)].push(order);
  }
  return buckets;
}

/**
 * Flatten orders into a day-grouped row list for FlashList.
 *
 * Partitioning is stable, so the caller's sort survives inside each day and the
 * grouping does not depend on the input already being ordered by date.
 */
export function buildOrderRows(orders: WorkOrder[], now: Date = new Date()): OrdersRow[] {
  if (orders.length === 0) return [];

  const buckets = partitionBuckets(orders, now);
  const rows: OrdersRow[] = [];
  let index = 0;

  for (const bucket of BUCKET_ORDER) {
    const group = buckets[bucket];
    if (!group.length) continue;
    rows.push({
      kind: 'header',
      id: `header-${bucket}`,
      label: BUCKET_LABEL[bucket],
      count: group.length,
    });
    for (let i = 0; i < group.length; i += 1) {
      const order = group[i]!;
      rows.push({
        kind: 'order',
        id: order.id,
        order,
        index,
        position: positionInGroup(i, group.length),
      });
      index += 1;
    }
  }

  return rows;
}

/** Day sections for SwiftUI `List` + `Section`. */
export function buildOrderSections(orders: WorkOrder[], now: Date = new Date()): OrdersSection[] {
  if (orders.length === 0) return [];

  const buckets = partitionBuckets(orders, now);
  const sections: OrdersSection[] = [];

  for (const bucket of BUCKET_ORDER) {
    const group = buckets[bucket];
    if (!group.length) continue;
    sections.push({
      id: `section-${bucket}`,
      label: BUCKET_LABEL[bucket],
      count: group.length,
      orders: group,
    });
  }

  return sections;
}
