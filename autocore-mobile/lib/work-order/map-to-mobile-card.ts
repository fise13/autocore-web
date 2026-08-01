import { isAssignedToWorkOrder, isClaimableWorkOrder } from '@autocore/rbac';
import { coerceToDate } from '@/lib/firestore-timestamp';
import type { WorkOrder } from '@/types/work-order';
import { isOpenStatus, STATUS_LABELS } from '@/lib/work-order/work-order-utils';
import type { OrderFilterId, OrderStatus, WorkOrder as MobileWorkOrder } from '@/features/orders/types';

function mapDomainStatusToMobile(status: WorkOrder['status']): OrderStatus {
  return status;
}

function estimateProgress(status: WorkOrder['status']): number {
  switch (status) {
    case 'draft':
      return 10;
    case 'confirmed':
      return 25;
    case 'waiting_parts':
      return 45;
    case 'in_progress':
      return 60;
    case 'completed':
      return 92;
    case 'delivered':
      return 100;
    case 'cancelled':
      return 0;
    default:
      return 35;
  }
}

function isSameCalendarDay(date: Date, now: Date): boolean {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatTimeLabel(value: Date): string {
  const date = coerceToDate(value) ?? new Date();
  const now = new Date();
  if (isSameCalendarDay(date, now)) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function isClosedToday(order: WorkOrder): boolean {
  if (order.status !== 'completed' && order.status !== 'delivered') {
    return false;
  }
  const stamp = coerceToDate(order.completedAt) ?? coerceToDate(order.updatedAt);
  if (!stamp) return false;
  return isSameCalendarDay(stamp, new Date());
}

function isClosedStatus(status: OrderStatus): boolean {
  return status === 'completed' || status === 'delivered' || status === 'cancelled';
}

export function mapWorkOrderToMobileCard(order: WorkOrder, uid?: string | null): MobileWorkOrder {
  const unassigned = isClaimableWorkOrder(order);
  const assignedToMe = uid ? isAssignedToWorkOrder(order, uid) : false;
  const assignee =
    order.laborLines[0]?.assigneeDisplayNames?.[0] ??
    (order.laborLines[0]?.assigneeIds.length ? 'Assigned' : unassigned ? 'Unassigned' : undefined);

  return {
    id: order.id,
    number: order.number,
    customer: order.clientName?.trim() || 'Customer',
    phone: order.clientPhone?.trim() || undefined,
    vehicle: order.vehicleLabel?.trim() || 'Vehicle',
    engine: order.motorLines[0]?.engineCode || order.motorLines[0]?.serialCode || '—',
    licensePlate: order.licensePlate || undefined,
    vin: order.vin || undefined,
    assignee,
    isUnassigned: unassigned,
    isAssignedToMe: assignedToMe,
    price: order.pricing.grandTotal,
    status: mapDomainStatusToMobile(order.status),
    priority: order.status === 'waiting_parts' ? 'high' : 'normal',
    progress: estimateProgress(order.status),
    estimated: isOpenStatus(order.status) ? STATUS_LABELS[order.status] : 'Closed',
    createdAt: formatTimeLabel(order.updatedAt),
    updatedAtMs: coerceToDate(order.updatedAt)?.getTime() ?? 0,
    closedToday: isClosedToday(order),
    partsNote: order.partLines.length > 0 ? `${order.partLines.length} items` : undefined,
    timeline: [
      {
        id: `${order.id}-created`,
        title: 'Created',
        time: formatTimeLabel(order.createdAt),
        done: true,
      },
      {
        id: `${order.id}-status`,
        title: STATUS_LABELS[order.status],
        time: formatTimeLabel(order.updatedAt),
        done: order.status !== 'draft',
      },
    ],
  };
}

function matchesStatusFilter(order: MobileWorkOrder, filter: OrderFilterId): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'open':
      return !isClosedStatus(order.status);
    case 'in_progress':
      return order.status === 'in_progress' || order.status === 'confirmed';
    case 'waiting':
      return order.status === 'waiting_parts';
    case 'done':
      return order.status === 'completed' || order.status === 'delivered';
    case 'free':
      return Boolean(order.isUnassigned);
    default:
      return true;
  }
}

export function filterMobileOrders(
  orders: MobileWorkOrder[],
  filter: OrderFilterId,
  query: string,
): MobileWorkOrder[] {
  const normalizedQuery = query.trim().toLowerCase();
  return orders.filter((order) => {
    if (!matchesStatusFilter(order, filter)) return false;
    if (!normalizedQuery) return true;
    const haystack = [
      order.number,
      order.customer,
      order.phone,
      order.vehicle,
      order.licensePlate,
      order.vin,
      order.assignee,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

/**
 * Row count per filter, derived from the same predicate the list filters with,
 * so a chip can never disagree with what tapping it produces.
 */
export function computeMobileFilterCounts(
  orders: MobileWorkOrder[],
  filters: readonly OrderFilterId[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const filter of filters) {
    counts[filter] = orders.filter((order) => matchesStatusFilter(order, filter)).length;
  }
  return counts;
}

export function computeMobileOrdersMeta(orders: MobileWorkOrder[]) {
  const openCount = orders.filter((order) => !isClosedStatus(order.status)).length;
  const inProgressCount = orders.filter(
    (order) => order.status === 'in_progress' || order.status === 'confirmed',
  ).length;
  const waitingCount = orders.filter((order) => order.status === 'waiting_parts').length;
  const closedToday = orders.filter((order) => order.closedToday);
  const freeCount = orders.filter((order) => order.isUnassigned).length;
  return {
    total: orders.length,
    openCount,
    inProgressCount,
    waitingCount,
    closedTodayCount: closedToday.length,
    freeCount,
    closedTodayRevenue: closedToday.reduce((sum, order) => sum + order.price, 0),
  };
}
