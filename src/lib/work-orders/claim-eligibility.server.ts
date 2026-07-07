import "server-only";

import {
  countOpenAssignedWorkOrders,
  DEFAULT_MAX_ACTIVE_WORK_ORDERS,
  evaluateClaimEligibility,
} from "@autocore/rbac";
import type { WorkOrder } from "@/domain/work-order";
import { WorkOrderClaimError } from "@/application/use-cases/work-orders/claim-work-order.server";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminWorkOrder } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";

async function fetchEmployeeRecord(
  companyId: string,
  uid: string,
): Promise<{ role: string; shiftOn: boolean }> {
  const snap = await getAdminFirestore()
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("employees")
    .doc(uid)
    .get();

  if (!snap.exists) {
    return { role: "employee", shiftOn: true };
  }

  const data = snap.data() as Record<string, unknown>;
  return {
    role: String(data.role ?? "employee"),
    shiftOn: data.shiftOn !== false,
  };
}

async function listCompanyWorkOrders(companyId: string): Promise<WorkOrder[]> {
  const snap = await getAdminFirestore()
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("workOrders")
    .orderBy("updatedAt", "desc")
    .limit(200)
    .get();

  return snap.docs.map((doc) => mapAdminWorkOrder(doc.id, doc.data() as Record<string, unknown>));
}

export async function assertClaimEligibility(params: {
  companyId: string;
  order: WorkOrder;
  actorUserId: string;
  maxActive?: number;
}): Promise<void> {
  const employee = await fetchEmployeeRecord(params.companyId, params.actorUserId);
  const orders = await listCompanyWorkOrders(params.companyId);
  const openAssignedCount = countOpenAssignedWorkOrders(orders, params.actorUserId);

  const result = evaluateClaimEligibility({
    order: params.order,
    uid: params.actorUserId,
    role: employee.role,
    shiftOn: employee.shiftOn,
    openAssignedCount,
    maxActive: params.maxActive ?? DEFAULT_MAX_ACTIVE_WORK_ORDERS,
  });

  if (!result.ok) {
    throw new WorkOrderClaimError(result.reason);
  }
}
