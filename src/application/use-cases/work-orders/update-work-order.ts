import { UpdateWorkOrderInput, WorkOrder } from "@/domain/work-order";
import { WorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";

const EDITABLE_STATUSES = new Set<WorkOrder["status"]>(["draft", "confirmed"]);

export async function updateWorkOrderUseCase(
  workOrderRepository: WorkOrderRepository,
  params: {
    companyId: string;
    workOrderId: string;
    input: UpdateWorkOrderInput;
  },
): Promise<void> {
  const existing = await workOrderRepository.getById(params.companyId, params.workOrderId);
  if (!existing) {
    throw new Error("Заказ-наряд не найден");
  }
  if (!EDITABLE_STATUSES.has(existing.status)) {
    throw new Error("Редактировать можно только draft или confirmed заказ-наряд");
  }

  await workOrderRepository.update(params.companyId, params.workOrderId, params.input);
}
