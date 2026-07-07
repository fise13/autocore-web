import { CreateWorkOrderInput, WorkOrder } from "@/domain/work-order";
import { buildOrderCreatedEvent } from "@/domain/work-order-state-machine";
import { DomainEventRepository } from "@/infrastructure/firestore/domain-event-repository";
import { WorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";
import { maybeEmitWorkOrderAvailableNotification } from "@/lib/notifications/emit-work-order-available.server";

export async function createWorkOrderUseCase(
  workOrderRepository: WorkOrderRepository,
  domainEventRepository: DomainEventRepository,
  input: CreateWorkOrderInput,
): Promise<WorkOrder> {
  const order = await workOrderRepository.create(input);
  await domainEventRepository.append(buildOrderCreatedEvent(order));
  void maybeEmitWorkOrderAvailableNotification({
    companyId: input.companyId,
    order,
    actorUserId: input.createdByUserId,
  }).catch((error) => {
    console.error("[create-work-order] available notification failed", error);
  });
  return order;
}
