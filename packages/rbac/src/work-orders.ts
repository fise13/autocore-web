export type LaborLineWithAssignees = {
  assigneeIds?: string[] | null;
};

export type WorkOrderWithLabor = {
  laborLines?: LaborLineWithAssignees[] | null;
};

export function isAssignedToWorkOrder(order: WorkOrderWithLabor, uid: string): boolean {
  for (const line of order.laborLines ?? []) {
    for (const assigneeId of line.assigneeIds ?? []) {
      if (assigneeId === uid) return true;
    }
  }
  return false;
}

export function filterWorkOrdersByScope<T extends WorkOrderWithLabor>(
  orders: T[],
  uid: string,
  scope: 'company' | 'assigned_work_orders' | 'none',
): T[] {
  if (scope === 'none') return [];
  if (scope === 'company') return orders;
  return orders.filter((order) => isAssignedToWorkOrder(order, uid));
}

export function requiresAssignedWorkOrderScope(role: string): boolean {
  return role === 'mechanic' || role === 'diagnostician';
}
