import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import {
  canMechanicClaimWorkOrder,
  findFirstUnassignedLaborLineId,
} from "@autocore/rbac";
import { WorkOrder, WorkOrderStatus } from "@/domain/work-order";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { fetchWorkOrder } from "@/infrastructure/firestore/admin/work-order-effects-admin";
import { emitNotificationEvent } from "@/lib/notifications/engine.server";
import { maybeEmitWorkOrderAvailableNotification } from "@/lib/notifications/emit-work-order-available.server";
import { assertClaimEligibility } from "@/lib/work-orders/claim-eligibility.server";
import { normalizeCompanyId } from "@/lib/company-id";

export class WorkOrderClaimError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkOrderClaimError";
  }
}

export async function claimWorkOrderUseCase(params: {
  companyId: string;
  workOrderId: string;
  actorUserId: string;
  actorName?: string;
  laborLineId?: string;
}): Promise<WorkOrder> {
  const order = await fetchWorkOrder(params.companyId, params.workOrderId);
  if (!order) {
    throw new WorkOrderClaimError("Заказ-наряд не найден");
  }

  if (!canMechanicClaimWorkOrder(order, params.actorUserId)) {
    throw new WorkOrderClaimError("Нельзя взять этот наряд в работу");
  }

  await assertClaimEligibility({
    companyId: params.companyId,
    order,
    actorUserId: params.actorUserId,
  });

  const targetLineId = params.laborLineId ?? findFirstUnassignedLaborLineId(order);
  if (!targetLineId) {
    throw new WorkOrderClaimError("Нет свободных работ для назначения");
  }

  const targetLine = order.laborLines.find((line) => line.id === targetLineId);
  if (!targetLine || targetLine.assigneeIds.length > 0) {
    throw new WorkOrderClaimError("Эта работа уже назначена");
  }

  const updatedLaborLines = order.laborLines.map((line) => {
    if (line.id !== targetLineId) return line;
    return {
      ...line,
      assigneeIds: [...line.assigneeIds, params.actorUserId],
    };
  });

  const nextStatus: WorkOrderStatus =
    order.status === "confirmed" ? "in_progress" : order.status;

  const db = getAdminFirestore();
  await db
    .collection("companies")
    .doc(normalizeCompanyId(params.companyId))
    .collection("workOrders")
    .doc(params.workOrderId)
    .update({
      laborLines: updatedLaborLines,
      status: nextStatus,
      updatedByUserId: params.actorUserId,
      updatedAt: FieldValue.serverTimestamp(),
    });

  await emitNotificationEvent({
    companyId: params.companyId,
    eventType: "work_order.assigned",
    actorUserId: params.actorUserId,
    actorName: params.actorName,
    aggregateType: "work_order",
    aggregateId: params.workOrderId,
    assigneeUserIds: [params.actorUserId],
    payload: {
      orderNumber: order.number,
      changeSummary: "self_claim",
    },
  });

  const updated = await fetchWorkOrder(params.companyId, params.workOrderId);
  if (!updated) {
    throw new WorkOrderClaimError("Не удалось загрузить обновлённый наряд");
  }
  return updated;
}
