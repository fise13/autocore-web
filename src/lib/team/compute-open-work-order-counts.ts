import { WorkOrder } from "@/domain/work-order";
import { computeOpenWorkOrderCounts as computeCounts } from "@autocore/rbac";

export function computeOpenWorkOrderCounts(workOrders: WorkOrder[]): Map<string, number> {
  return computeCounts(workOrders);
}
