import { CreateWorkOrderInput, WorkOrder } from "@/domain/work-order";
import { buildOrderCreatedEvent } from "@/domain/work-order-state-machine";
import { DomainEventRepository } from "@/infrastructure/firestore/domain-event-repository";
import { WorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";

export async function createWorkOrderUseCase(
  workOrderRepository: WorkOrderRepository,
  domainEventRepository: DomainEventRepository,
  input: CreateWorkOrderInput,
): Promise<WorkOrder> {
  const order = await workOrderRepository.create(input);
  await domainEventRepository.append(buildOrderCreatedEvent(order));
  return order;
}
