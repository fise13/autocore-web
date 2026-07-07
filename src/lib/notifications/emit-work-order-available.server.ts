import "server-only";

import { isClaimableWorkOrder } from "@autocore/rbac";
import type { WorkOrder } from "@/domain/work-order";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { emitNotificationEvent } from "@/lib/notifications/engine.server";
import { normalizeCompanyId } from "@/lib/company-id";

export async function resolveWorkOrderPoolRecipientIds(
  companyId: string,
  excludeUserId?: string,
): Promise<string[]> {
  const snap = await getAdminFirestore()
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("employees")
    .get();

  const recipientIds: string[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const uid = String(data.uid ?? doc.id);
    if (excludeUserId && uid === excludeUserId) continue;
    if (data.isActive === false) continue;
    if (data.shiftOn === false) continue;
    const role = String(data.role ?? "");
    if (role !== "mechanic" && role !== "diagnostician") continue;
    recipientIds.push(uid);
  }

  return recipientIds;
}

export async function maybeEmitWorkOrderAvailableNotification(params: {
  companyId: string;
  order: WorkOrder;
  actorUserId?: string;
}): Promise<void> {
  if (!isClaimableWorkOrder(params.order)) return;

  const recipientUserIds = await resolveWorkOrderPoolRecipientIds(
    params.companyId,
    params.actorUserId,
  );
  if (recipientUserIds.length === 0) return;

  await emitNotificationEvent({
    companyId: params.companyId,
    eventType: "work_order.available",
    actorUserId: params.actorUserId,
    aggregateType: "work_order",
    aggregateId: params.order.id,
    recipientUserIds,
    payload: {
      orderNumber: params.order.number,
      vehicleLabel: params.order.vehicleLabel,
      licensePlate: params.order.licensePlate,
    },
  });
}
