import { MotorEntity } from "@/domain/motor";
import { WorkOrder } from "@/domain/work-order";
import { CompanyEmployee } from "@/domain/rbac";
import { companyBrandingFromRecord } from "@/domain/company-branding";
import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  mapAdminClient,
  mapAdminCompany,
  mapAdminEmployee,
  mapAdminMotor,
  mapAdminVehicle,
  mapAdminWorkOrder,
} from "@/infrastructure/firestore/admin-mappers";
import { summarizeWorkOrderForLogbook } from "@/lib/documents/classify-service-order";
import { buildDocumentContext, DocumentContext, VehicleLogbookSource } from "@/lib/documents/document-context";
import { coerceDocumentDate } from "@/lib/documents/format";
import { resolveCompanyLogoDataUri } from "@/lib/documents/resolve-company-logo";
import { normalizeCompanyId } from "@/lib/company-id";
import { formatWorkOrderLabel } from "@/lib/work-order/work-order-display";

async function fetchMotorById(companyId: string, motorId: string): Promise<MotorEntity | null> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const directRef = db.collection("companies").doc(normalizedCompanyId).collection("motors").doc(motorId);
  const directSnap = await directRef.get();
  if (directSnap.exists) {
    return mapAdminMotor(directSnap.id, directSnap.data() as Record<string, unknown>);
  }

  // Avoid full-company collectionGroup scan on every miss — rare legacy ids only.
  return null;
}

function orderServiceDate(order: WorkOrder): Date {
  return order.deliveredAt ?? order.completedAt ?? order.confirmedAt ?? order.updatedAt ?? order.createdAt;
}

function collectAssigneeIds(order: WorkOrder): string[] {
  const ids = new Set<string>();
  for (const line of order.laborLines) {
    for (const id of line.assigneeIds ?? []) {
      if (id?.trim()) ids.add(id.trim());
    }
  }
  return [...ids];
}

async function fetchEmployeesByIds(
  companyId: string,
  employeeIds: string[],
): Promise<CompanyEmployee[]> {
  if (employeeIds.length === 0) return [];
  const db = getAdminFirestore();
  const employeesRef = db.collection("companies").doc(companyId).collection("employees");

  const snaps = await Promise.all(employeeIds.map((id) => employeesRef.doc(id).get()));
  const byId = new Map<string, CompanyEmployee>();

  for (const snap of snaps) {
    if (!snap.exists) continue;
    const employee = mapAdminEmployee(snap.id, companyId, snap.data() as Record<string, unknown>);
    byId.set(snap.id, employee);
    if (employee.uid) byId.set(employee.uid, employee);
  }

  // Some assigneeIds store uid rather than employee doc id — resolve by uid field.
  const missingUids = employeeIds.filter((id) => !byId.has(id));
  if (missingUids.length > 0) {
    const uidSnaps = await Promise.all(
      missingUids.map((uid) => employeesRef.where("uid", "==", uid).limit(1).get()),
    );
    for (const snap of uidSnaps) {
      if (snap.empty) continue;
      const doc = snap.docs[0]!;
      const employee = mapAdminEmployee(doc.id, companyId, doc.data() as Record<string, unknown>);
      byId.set(doc.id, employee);
      if (employee.uid) byId.set(employee.uid, employee);
    }
  }

  return [...new Map([...byId.values()].map((e) => [e.id, e])).values()];
}

async function fetchVehicleLogbook(
  companyId: string,
  vehicleId: string,
  currentOrder: WorkOrder,
): Promise<VehicleLogbookSource[]> {
  const db = getAdminFirestore();
  const vehicleRef = db.collection("companies").doc(companyId).collection("vehicles").doc(vehicleId);

  const historySnapshot = await vehicleRef.collection("serviceHistory").orderBy("date", "asc").limit(50).get();

  if (!historySnapshot.empty) {
    return historySnapshot.docs.map((doc) => {
      const data = doc.data();
      const workTypes = Array.isArray(data.workTypes) ? data.workTypes.map(String) : [];
      return {
        workOrderId: String(data.workOrderId ?? doc.id),
        date: coerceDocumentDate(data.date),
        mileage: Number(data.mileage ?? 0),
        title: workTypes[0] ?? "Обслуживание",
      };
    });
  }

  const ordersSnapshot = await db
    .collection("companies")
    .doc(companyId)
    .collection("workOrders")
    .where("vehicleId", "==", vehicleId)
    .limit(40)
    .get();

  const sources = ordersSnapshot.docs
    .map((doc) => {
      const order = mapAdminWorkOrder(doc.id, doc.data() as Record<string, unknown>);
      return {
        order,
        entry: {
          workOrderId: order.id,
          date: orderServiceDate(order),
          mileage: order.mileage || 0,
          title: summarizeWorkOrderForLogbook(order),
        },
      };
    })
    .filter(({ order }) => ["completed", "delivered"].includes(order.status))
    .map(({ entry }) => entry);

  const hasCurrent = sources.some((entry) => entry.workOrderId === currentOrder.id);
  if (!hasCurrent && ["completed", "delivered"].includes(currentOrder.status)) {
    sources.push({
      workOrderId: currentOrder.id,
      date: orderServiceDate(currentOrder),
      mileage: currentOrder.mileage || 0,
      title: summarizeWorkOrderForLogbook(currentOrder),
    });
  }

  return sources.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function loadDocumentContext(companyId: string, workOrderId: string): Promise<DocumentContext> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const db = getAdminFirestore();

  const orderRef = db
    .collection("companies")
    .doc(normalizedCompanyId)
    .collection("workOrders")
    .doc(workOrderId);
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) {
    throw new Error("Work order not found");
  }

  const order = mapAdminWorkOrder(orderSnapshot.id, orderSnapshot.data() as Record<string, unknown>);
  const assigneeIds = collectAssigneeIds(order);

  const [companySnapshot, clientSnapshot, vehicleSnapshot, employees] = await Promise.all([
    db.collection("companies").doc(normalizedCompanyId).get(),
    order.clientId
      ? db.collection("companies").doc(normalizedCompanyId).collection("clients").doc(order.clientId).get()
      : Promise.resolve(null),
    order.vehicleId
      ? db.collection("companies").doc(normalizedCompanyId).collection("vehicles").doc(order.vehicleId).get()
      : Promise.resolve(null),
    fetchEmployeesByIds(normalizedCompanyId, assigneeIds),
  ]);

  const companyData = companySnapshot.exists ? (companySnapshot.data() as Record<string, unknown>) : null;
  const branding = companyBrandingFromRecord(companyData);
  const logoSource =
    typeof companyData?.logoUrl === "string"
      ? companyData.logoUrl
      : typeof companyData?.logoDataUrl === "string"
        ? companyData.logoDataUrl
        : undefined;
  const logoDataUri = await resolveCompanyLogoDataUri(logoSource);

  const company = companySnapshot.exists
    ? mapAdminCompany(companySnapshot.id, companyData as Record<string, unknown>)
    : { id: normalizedCompanyId, name: "Сервисный центр", ownerId: "" };

  const client =
    clientSnapshot?.exists === true
      ? mapAdminClient(clientSnapshot.id, clientSnapshot.data() as Record<string, unknown>)
      : null;

  const vehicle =
    vehicleSnapshot?.exists === true
      ? mapAdminVehicle(vehicleSnapshot.id, vehicleSnapshot.data() as Record<string, unknown>)
      : null;

  const motorIds = [...new Set(order.motorLines.map((line) => line.motorId).filter(Boolean))];
  const motors = (
    await Promise.all(motorIds.map((motorId) => fetchMotorById(normalizedCompanyId, motorId)))
  ).filter((motor): motor is MotorEntity => motor != null);

  const needsLogbook =
    branding.showServiceLogbook !== false &&
    (branding.documentTheme === "racing" || order.status === "completed" || order.status === "delivered");

  const vehicleLogbook =
    needsLogbook && order.vehicleId
      ? await fetchVehicleLogbook(normalizedCompanyId, order.vehicleId, order).catch(() => [])
      : [];

  let warrantyVerificationToken: string | undefined;
  const primaryMotorId = order.motorLines[0]?.motorId;
  if (primaryMotorId) {
    const warrantySnap = await db
      .collection("companies")
      .doc(normalizedCompanyId)
      .collection("warranties")
      .where("motorId", "==", primaryMotorId)
      .where("workOrderId", "==", workOrderId)
      .limit(1)
      .get()
      .catch(() => null);
    if (warrantySnap && !warrantySnap.empty) {
      warrantyVerificationToken = String(warrantySnap.docs[0].data().verificationToken ?? "");
    }
  }

  return buildDocumentContext({
    company,
    companyRecord: companyData ?? undefined,
    order,
    orderLabel: formatWorkOrderLabel(order, order.number.match(/^\d+$/) ? Number(order.number) : undefined),
    client,
    vehicle,
    motors,
    employees,
    logoDataUri,
    vehicleLogbook,
    warrantyVerificationToken,
  });
}

export function serializeDocumentContext(context: DocumentContext): Record<string, unknown> {
  return {
    ...context,
    assigneeNames: Object.fromEntries(context.assigneeNames),
    generatedAt: context.generatedAt.toISOString(),
    vehicleLogbook: context.vehicleLogbook.map((entry) => ({
      ...entry,
      date: entry.date.toISOString(),
    })),
    order: {
      ...context.order,
      createdAt: context.order.createdAt.toISOString(),
      updatedAt: context.order.updatedAt.toISOString(),
      confirmedAt: context.order.confirmedAt?.toISOString(),
      completedAt: context.order.completedAt?.toISOString(),
      deliveredAt: context.order.deliveredAt?.toISOString(),
      cancelledAt: context.order.cancelledAt?.toISOString(),
    },
  };
}
