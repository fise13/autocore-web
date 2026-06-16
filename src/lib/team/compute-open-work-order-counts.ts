import { WorkOrder } from "@/domain/work-order";

const CLOSED_STATUSES = new Set<WorkOrder["status"]>(["completed", "delivered", "cancelled"]);

export function computeOpenWorkOrderCounts(workOrders: WorkOrder[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const workOrder of workOrders) {
    if (CLOSED_STATUSES.has(workOrder.status)) continue;

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
