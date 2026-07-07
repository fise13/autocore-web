export type LaborLineWithAssignees = {
  id?: string;
  assigneeIds?: string[] | null;
};

export type WorkOrderWithLabor = {
  status?: string;
  laborLines?: LaborLineWithAssignees[] | null;
};

export const CLAIMABLE_WORK_ORDER_STATUSES = new Set([
  'confirmed',
  'in_progress',
  'waiting_parts',
]);

const CLOSED_WORK_ORDER_STATUSES = new Set(['completed', 'delivered', 'cancelled']);

export function isAssignedToWorkOrder(order: WorkOrderWithLabor, uid: string): boolean {
  for (const line of order.laborLines ?? []) {
    for (const assigneeId of line.assigneeIds ?? []) {
      if (assigneeId === uid) return true;
    }
  }
  return false;
}

export function hasUnassignedLaborLine(order: WorkOrderWithLabor): boolean {
  for (const line of order.laborLines ?? []) {
    if (!line.assigneeIds?.length) return true;
  }
  return false;
}

export function isClaimableWorkOrder(order: WorkOrderWithLabor): boolean {
  const status = order.status;
  if (!status || CLOSED_WORK_ORDER_STATUSES.has(status)) return false;
  if (!CLAIMABLE_WORK_ORDER_STATUSES.has(status)) return false;
  return hasUnassignedLaborLine(order);
}

export function canMechanicClaimWorkOrder(order: WorkOrderWithLabor, uid: string): boolean {
  if (!uid) return false;
  if (isAssignedToWorkOrder(order, uid)) return false;
  return isClaimableWorkOrder(order);
}

export function findFirstUnassignedLaborLineId(order: WorkOrderWithLabor): string | null {
  for (const line of order.laborLines ?? []) {
    if (!line.assigneeIds?.length && line.id) return line.id;
  }
  return null;
}

export function filterWorkOrdersByScope<T extends WorkOrderWithLabor>(
  orders: T[],
  uid: string,
  scope: 'company' | 'assigned_work_orders' | 'none',
): T[] {
  if (scope === 'none') return [];
  if (scope === 'company') return orders;
  return orders.filter(
    (order) => isAssignedToWorkOrder(order, uid) || isClaimableWorkOrder(order),
  );
}

export function computeOpenWorkOrderCounts(orders: WorkOrderWithLabor[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const workOrder of orders) {
    if (workOrder.status && CLOSED_WORK_ORDER_STATUSES.has(workOrder.status)) continue;

    const assigneeIds = new Set<string>();
    for (const line of workOrder.laborLines ?? []) {
      for (const assigneeId of line.assigneeIds ?? []) {
        assigneeIds.add(assigneeId);
      }
    }

    for (const assigneeId of assigneeIds) {
      counts.set(assigneeId, (counts.get(assigneeId) ?? 0) + 1);
    }
  }

  return counts;
}

export function requiresAssignedWorkOrderScope(role: string): boolean {
  return role === 'mechanic' || role === 'diagnostician';
}

export const DEFAULT_MAX_ACTIVE_WORK_ORDERS = 3;

const OPEN_WORK_ORDER_STATUSES = new Set(['draft', 'confirmed', 'in_progress', 'waiting_parts']);

export function isOpenWorkOrderStatus(status?: string): boolean {
  return Boolean(status && OPEN_WORK_ORDER_STATUSES.has(status));
}

export function countOpenAssignedWorkOrders(
  orders: WorkOrderWithLabor[],
  uid: string,
): number {
  let count = 0;
  for (const order of orders) {
    if (!isOpenWorkOrderStatus(order.status)) continue;
    if (isAssignedToWorkOrder(order, uid)) count += 1;
  }
  return count;
}

export function isEmployeeOnShift(employee: { shiftOn?: boolean | null } | null | undefined): boolean {
  return employee?.shiftOn !== false;
}

export type ClaimEligibilityResult =
  | { ok: true }
  | { ok: false; reason: string };

export function evaluateClaimEligibility(params: {
  order: WorkOrderWithLabor;
  uid: string;
  role: string;
  shiftOn: boolean;
  openAssignedCount: number;
  maxActive?: number;
}): ClaimEligibilityResult {
  if (!canMechanicClaimWorkOrder(params.order, params.uid)) {
    return { ok: false, reason: 'Нельзя взять этот наряд в работу' };
  }

  if (!requiresAssignedWorkOrderScope(params.role)) {
    return { ok: true };
  }

  if (!params.shiftOn) {
    return { ok: false, reason: 'Включите смену, чтобы брать свободные наряды' };
  }

  const limit = params.maxActive ?? DEFAULT_MAX_ACTIVE_WORK_ORDERS;
  if (params.openAssignedCount >= limit) {
    return {
      ok: false,
      reason: `Достигнут лимит активных нарядов (${limit}). Закройте текущий, чтобы взять новый.`,
    };
  }

  return { ok: true };
}
