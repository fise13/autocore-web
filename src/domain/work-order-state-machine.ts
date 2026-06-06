import { CreateDomainEventInput, DomainEventType } from "@/domain/domain-event";
import { WorkOrder, WorkOrderStatus, isWarehousePartLine } from "@/domain/work-order";

const ALLOWED_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "waiting_parts", "cancelled"],
  in_progress: ["waiting_parts", "completed", "cancelled"],
  waiting_parts: ["in_progress", "completed", "cancelled"],
  completed: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransitionWorkOrderStatus(
  current: WorkOrderStatus,
  next: WorkOrderStatus,
): boolean {
  return current === next || ALLOWED_TRANSITIONS[current]?.includes(next) === true;
}

export function assertWorkOrderStatusTransition(
  current: WorkOrderStatus,
  next: WorkOrderStatus,
) {
  if (!canTransitionWorkOrderStatus(current, next)) {
    throw new Error(`Недопустимый переход заказ-наряда: ${current} → ${next}`);
  }
}

function event(
  order: WorkOrder,
  type: DomainEventType,
  payload: Record<string, unknown> = {},
  scope: string = type,
): CreateDomainEventInput {
  return {
    companyId: order.companyId,
    type,
    aggregateType: "work_order",
    aggregateId: order.id,
    payload: {
      workOrderId: order.id,
      workOrderNumber: order.number,
      status: order.status,
      ...payload,
    },
    idempotencyKey: `${scope}:${order.id}`,
  };
}

export function buildOrderCreatedEvent(order: WorkOrder): CreateDomainEventInput {
  return event(order, "OrderCreated");
}

export function buildWorkOrderTransitionEvents(
  order: WorkOrder,
  nextStatus: WorkOrderStatus,
): CreateDomainEventInput[] {
  assertWorkOrderStatusTransition(order.status, nextStatus);
  if (order.status === nextStatus) return [];

  switch (nextStatus) {
    case "confirmed":
      return [
        event(order, "OrderConfirmed"),
        ...order.motorLines.map((line) =>
          event(order, "EngineReserved", { motorLineId: line.id, motorId: line.motorId }, `EngineReserved:${line.motorId}`),
        ),
        ...order.partLines.filter(isWarehousePartLine).map((line) =>
          event(
            order,
            "InventoryReserved",
            {
              partLineId: line.id,
              itemId: line.itemId,
              quantity: line.quantity,
              warehouseId: line.warehouseId ?? null,
            },
            `InventoryReserved:${line.itemId}:${line.quantity}`,
          ),
        ),
      ];
    case "in_progress":
      // Resuming from waiting_parts only updates status — OrderStarted already exists.
      if (order.status === "waiting_parts") return [];
      return [event(order, "OrderStarted")];
    case "waiting_parts":
      return [event(order, "OrderWaitingParts")];
    case "completed":
      return [
        event(order, "OrderCompleted"),
        ...order.partLines.filter(isWarehousePartLine).map((line) =>
          event(
            order,
            "InventoryDeducted",
            {
              partLineId: line.id,
              itemId: line.itemId,
              quantity: line.quantity,
              unitCost: line.unitCost,
              warehouseId: line.warehouseId ?? null,
            },
            `InventoryDeducted:${line.itemId}:${line.quantity}`,
          ),
        ),
        ...order.motorLines.map((line) =>
          event(
            order,
            line.outcome === "sell" ? "EngineSold" : "EngineInstalled",
            { motorLineId: line.id, motorId: line.motorId, outcome: line.outcome },
            `${line.outcome === "sell" ? "EngineSold" : "EngineInstalled"}:${line.motorId}`,
          ),
        ),
        ...(order.motorLines.length > 0 ? [event(order, "WarrantyActivated")] : []),
        event(order, "SalaryCalculated"),
        event(order, "FinancialTransactionCreated"),
        event(order, "VehicleHistoryRecorded"),
        event(order, "DocumentsGenerated"),
      ];
    case "delivered":
      return [event(order, "OrderDelivered")];
    case "cancelled":
      return [
        event(order, "OrderCancelled"),
        ...order.motorLines.map((line) =>
          event(order, "EngineReleased", { motorLineId: line.id, motorId: line.motorId }, `EngineReleased:${line.motorId}`),
        ),
        ...order.partLines.filter(isWarehousePartLine).map((line) =>
          event(
            order,
            "InventoryReleased",
            {
              partLineId: line.id,
              itemId: line.itemId,
              quantity: line.quantity,
              warehouseId: line.warehouseId ?? null,
            },
            `InventoryReleased:${line.itemId}:${line.quantity}`,
          ),
        ),
      ];
    default:
      return [];
  }
}
