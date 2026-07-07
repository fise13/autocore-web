import { WorkOrderStatus } from "@/domain/work-order";
import { buildWorkOrderTransitionEvents } from "@/domain/work-order-state-machine";
import { DomainEventRepository } from "@/infrastructure/firestore/domain-event-repository";
import { WorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";

export async function transitionWorkOrderStatusUseCase(
  workOrderRepository: WorkOrderRepository,
  domainEventRepository: DomainEventRepository,
  params: {
    companyId: string;
    workOrderId: string;
    nextStatus: WorkOrderStatus;
    actorUserId: string;
  },
): Promise<void> {
  const order = await workOrderRepository.getById(params.companyId, params.workOrderId);
  if (!order) {
    throw new Error("Заказ-наряд не найден");
  }

  const events = buildWorkOrderTransitionEvents(order, params.nextStatus);
  await domainEventRepository.appendMany(params.companyId, events);
  await workOrderRepository.updateStatus(
    params.companyId,
    params.workOrderId,
    params.nextStatus,
    params.actorUserId,
  );
}
