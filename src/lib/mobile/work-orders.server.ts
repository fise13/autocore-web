import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { CreateDomainEventInput } from "@/domain/domain-event";
import {
  WorkOrder,
  WorkOrderPartLine,
  WorkOrderStatus,
  calculateWorkOrderPricing,
  isWarehousePartLine,
} from "@/domain/work-order";
import {
  buildWorkOrderTransitionEvents,
  canTransitionWorkOrderStatus,
} from "@/domain/work-order-state-machine";
import { processWorkOrderEventsUseCase } from "@/application/use-cases/process-work-order-events.server";
import { STATUS_LABELS, transitionLabel } from "@/components/work-orders/work-order-copy";
import { nextStatuses } from "@/components/work-orders/work-order-utils";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminWorkOrder } from "@/infrastructure/firestore/admin-mappers";
import { fetchWorkOrder } from "@/infrastructure/firestore/admin/work-order-effects-admin";
import { emit as emitKnowledgeEventAdmin, processEvent as processKnowledgeEventAdmin } from "@/infrastructure/firestore/admin/knowledge-admin";
import { fromWorkOrderCompleted } from "@/lib/knowledge/collector";
import { normalizeCompanyId } from "@/lib/company-id";
import { resolveMobileScan } from "@/lib/mobile/scan-resolve.server";
import { maybeEmitWorkOrderAvailableNotification } from "@/lib/notifications/emit-work-order-available.server";
import {
  canMechanicClaimWorkOrder,
  isAssignedToWorkOrder,
  isClaimableWorkOrder,
  type DataScope,
} from "@autocore/rbac";
import { claimWorkOrderUseCase, WorkOrderClaimError } from "@/application/use-cases/work-orders/claim-work-order.server";

export class WorkOrderAccessError extends Error {
  constructor(message = "Нет доступа к этому наряду") {
    super(message);
    this.name = "WorkOrderAccessError";
  }
}

export function assertWorkOrderAccess(order: WorkOrder, uid: string, scope: DataScope): void {
  if (scope === "none") {
    throw new WorkOrderAccessError();
  }
  if (
    scope === "assigned_work_orders" &&
    !isAssignedToWorkOrder(order, uid) &&
    !isClaimableWorkOrder(order)
  ) {
    throw new WorkOrderAccessError();
  }
}

export { WorkOrderClaimError };

const MOBILE_OPEN_STATUSES = new Set<WorkOrderStatus>([
  "confirmed",
  "in_progress",
  "waiting_parts",
]);

export type MobileWorkOrderPartLine = {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  source?: string;
};

export type MobileWorkOrderSummary = {
  id: string;
  number: string;
  status: WorkOrderStatus;
  statusLabel: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  vehicleLabel?: string;
  licensePlate: string;
  comment?: string;
  partLineCount: number;
  laborLineCount: number;
  grandTotal: number;
  updatedAt: string;
  assignedToMe: boolean;
  nextStatuses: Array<{
    status: WorkOrderStatus;
    label: string;
  }>;
};

export type MobileWorkOrderDetail = MobileWorkOrderSummary & {
  clientPhone?: string;
  vin: string;
  mileage: number;
  partLines: MobileWorkOrderPartLine[];
  laborTitles: string[];
};

function stableEventId(input: CreateDomainEventInput): string {
  return (input.id ?? input.idempotencyKey).replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function appendDomainEventsAdmin(
  companyId: string,
  events: CreateDomainEventInput[],
): Promise<void> {
  if (events.length === 0) return;
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const batch = db.batch();
  let writes = 0;

  for (const event of events) {
    const id = stableEventId(event);
    const ref = db
      .collection("companies")
      .doc(normalizedCompanyId)
      .collection("domainEvents")
      .doc(id);
    const existing = await ref.get();
    if (existing.exists) continue;

    batch.set(ref, {
      companyId: normalizedCompanyId,
      type: event.type,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      payload: event.payload,
      idempotencyKey: event.idempotencyKey,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });
    writes += 1;
  }

  if (writes > 0) {
    await batch.commit();
  }
}

function timestampFieldForStatus(status: WorkOrderStatus): string | null {
  if (status === "confirmed") return "confirmedAt";
  if (status === "completed") return "completedAt";
  if (status === "delivered") return "deliveredAt";
  if (status === "cancelled") return "cancelledAt";
  return null;
}

function toSummary(order: WorkOrder, uid: string): MobileWorkOrderSummary {
  const transitions = nextStatuses(order.status).map((status) => ({
    status,
    label: transitionLabel(order.status, status),
  }));

  return {
    id: order.id,
    number: order.number,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status],
    clientId: order.clientId,
    clientName: order.clientName,
    clientPhone: order.clientPhone,
    vehicleLabel: order.vehicleLabel,
    licensePlate: order.licensePlate,
    comment: order.comment,
    partLineCount: order.partLines.length,
    laborLineCount: order.laborLines.length,
    grandTotal: order.pricing.grandTotal,
    updatedAt: order.updatedAt.toISOString(),
    assignedToMe: isAssignedToWorkOrder(order, uid),
    nextStatuses: transitions,
  };
}

function toDetail(order: WorkOrder, uid: string): MobileWorkOrderDetail {
  return {
    ...toSummary(order, uid),
    clientPhone: order.clientPhone,
    vin: order.vin,
    mileage: order.mileage,
    partLines: order.partLines.map((line) => ({
      id: line.id,
      name: line.name,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      source: line.source,
    })),
    laborTitles: order.laborLines.map((line) => line.title),
  };
}

async function listWorkOrders(companyId: string): Promise<WorkOrder[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("workOrders")
    .orderBy("updatedAt", "desc")
    .limit(100)
    .get();

  return snap.docs.map((doc) => mapAdminWorkOrder(doc.id, doc.data() as Record<string, unknown>));
}

export async function listMobileWorkOrders(params: {
  companyId: string;
  uid: string;
  mineOnly: boolean;
  /** When true, include draft / completed / delivered. Cancelled stays excluded. */
  includeClosed?: boolean;
}): Promise<MobileWorkOrderSummary[]> {
  const orders = await listWorkOrders(params.companyId);
  const includeClosed = params.includeClosed === true;

  return orders
    .filter((order) => {
      if (order.status === "cancelled") return false;
      if (includeClosed) return true;
      return MOBILE_OPEN_STATUSES.has(order.status);
    })
    .filter((order) => (params.mineOnly ? isAssignedToWorkOrder(order, params.uid) : true))
    .map((order) => toSummary(order, params.uid));
}

export async function getMobileWorkOrderDetail(params: {
  companyId: string;
  workOrderId: string;
  uid: string;
  scope?: DataScope;
}): Promise<MobileWorkOrderDetail | null> {
  const order = await fetchWorkOrder(params.companyId, params.workOrderId);
  if (!order) return null;
  if (params.scope) {
    assertWorkOrderAccess(order, params.uid, params.scope);
  }
  return toDetail(order, params.uid);
}

export async function transitionMobileWorkOrder(params: {
  companyId: string;
  workOrderId: string;
  nextStatus: WorkOrderStatus;
  actorUserId: string;
  scope?: DataScope;
}): Promise<{ order: MobileWorkOrderDetail; documentJobId?: string }> {
  const order = await fetchWorkOrder(params.companyId, params.workOrderId);
  if (!order) {
    throw new Error("Work order not found");
  }

  if (params.scope) {
    assertWorkOrderAccess(order, params.actorUserId, params.scope);
  }

  if (!canTransitionWorkOrderStatus(order.status, params.nextStatus)) {
    const from = STATUS_LABELS[order.status];
    const to = STATUS_LABELS[params.nextStatus];
    const allowed = nextStatuses(order.status)
      .filter((status) => status !== "cancelled")
      .map((status) => STATUS_LABELS[status]);
    const hint =
      allowed.length > 0
        ? ` Next step from ${from}: ${allowed.join(" or ")}.`
        : ` ${from} has no further steps.`;
    throw new Error(`Cannot move from ${from} to ${to}.${hint}`);
  }

  const events = buildWorkOrderTransitionEvents(order, params.nextStatus);
  await appendDomainEventsAdmin(params.companyId, events);

  const timestampField = timestampFieldForStatus(params.nextStatus);
  const db = getAdminFirestore();
  await db
    .collection("companies")
    .doc(normalizeCompanyId(params.companyId))
    .collection("workOrders")
    .doc(params.workOrderId)
    .update({
      status: params.nextStatus,
      updatedByUserId: params.actorUserId,
      updatedAt: FieldValue.serverTimestamp(),
      ...(timestampField ? { [timestampField]: FieldValue.serverTimestamp() } : {}),
    });

  let documentJobId: string | undefined;

  if (params.nextStatus === "completed") {
    const eventsResult = await processWorkOrderEventsUseCase({
      companyId: params.companyId,
      workOrderId: params.workOrderId,
      actorUserId: params.actorUserId,
    });
    documentJobId = eventsResult.jobId;
  }

  const updated = await fetchWorkOrder(params.companyId, params.workOrderId);
  if (!updated) {
    throw new Error("Could not load the updated work order");
  }

  void maybeEmitWorkOrderAvailableNotification({
    companyId: params.companyId,
    order: updated,
    actorUserId: params.actorUserId,
  }).catch(() => undefined);

  if (params.nextStatus === "completed") {
    void emitWorkOrderCompletedKnowledgeFact(params.companyId, updated, params.actorUserId).catch(
      () => undefined,
    );
  }

  return { order: toDetail(updated, params.actorUserId), documentJobId };
}

/** Folds a just-completed work order into the Business Knowledge Engine (parts/labor/mechanic co-occurrence). */
async function emitWorkOrderCompletedKnowledgeFact(
  companyId: string,
  order: WorkOrder,
  actorUserId: string,
): Promise<void> {
  const partSkus: string[] = [];
  const partNames: Record<string, string> = {};
  for (const line of order.partLines) {
    const key = line.sku?.trim() || line.id;
    partSkus.push(key);
    partNames[key] = line.name;
  }
  const mechanicIds = [...new Set(order.laborLines.flatMap((line) => line.assigneeIds ?? []))];
  const engineCode = order.motorLines[0]?.engineCode;
  const brandName = order.motorLines[0]?.brandName;

  const draft = fromWorkOrderCompleted({
    companyId,
    workOrderId: order.id,
    actorUserId,
    clientId: order.clientId,
    vehicleId: order.vehicleId,
    mechanicIds,
    engineCode,
    brandName,
    partSkus,
    partNames,
    laborTitles: order.laborLines.map((line) => line.title),
  });

  const event = await emitKnowledgeEventAdmin(companyId, draft);
  await processKnowledgeEventAdmin(companyId, event.id);
}

function nextPartLineId(): string {
  return `part-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function resolveDefaultWarehouseId(companyId: string): Promise<string | undefined> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("warehouses")
    .where("companyId", "==", normalizeCompanyId(companyId))
    .limit(5)
    .get();
  if (snap.empty) return undefined;
  const preferred = snap.docs.find((doc) => doc.data().isDefault === true);
  return (preferred ?? snap.docs[0]).id;
}

export async function addPartToMobileWorkOrder(params: {
  companyId: string;
  workOrderId: string;
  actorUserId: string;
  itemId: string;
  quantity?: number;
  scope?: DataScope;
}): Promise<MobileWorkOrderDetail> {
  const order = await fetchWorkOrder(params.companyId, params.workOrderId);
  if (!order) {
    throw new Error("Work order not found");
  }

  if (params.scope) {
    assertWorkOrderAccess(order, params.actorUserId, params.scope);
  }

  if (!MOBILE_OPEN_STATUSES.has(order.status)) {
    throw new Error("Parts can only be added to an open work order");
  }

  const quantity = Math.max(1, Math.floor(Number(params.quantity ?? 1)));
  const db = getAdminFirestore();
  const itemSnap = await db.collection("inventoryItems").doc(params.itemId).get();
  if (!itemSnap.exists) {
    throw new Error("Item not found");
  }
  const itemData = itemSnap.data() as Record<string, unknown>;
  if (normalizeCompanyId(String(itemData.companyId ?? "")) !== normalizeCompanyId(params.companyId)) {
    throw new Error("Item not found");
  }

  const sku = String(itemData.sku ?? "");
  const name = String(itemData.name ?? sku);
  const unitPrice = Number(itemData.sellPrice ?? itemData.averageCost ?? itemData.purchasePrice ?? 0);
  const unitCost = Number(itemData.averageCost ?? itemData.purchasePrice ?? 0);
  const warehouseId = await resolveDefaultWarehouseId(params.companyId);

  const existing = order.partLines.find(
    (line) => isWarehousePartLine(line) && line.itemId === params.itemId,
  );

  let partLines: WorkOrderPartLine[];
  if (existing) {
    partLines = order.partLines.map((line) =>
      line.id === existing.id ? { ...line, quantity: line.quantity + quantity } : line,
    );
  } else {
    partLines = [
      ...order.partLines,
      {
        id: nextPartLineId(),
        itemId: params.itemId,
        source: "warehouse",
        sku,
        name,
        quantity,
        unitPrice,
        unitCost,
        warehouseId,
      },
    ];
  }

  const pricing = calculateWorkOrderPricing(
    order.laborLines,
    partLines,
    order.motorLines,
    order.pricing.discount,
  );

  await db
    .collection("companies")
    .doc(normalizeCompanyId(params.companyId))
    .collection("workOrders")
    .doc(params.workOrderId)
    .update({
      partLines,
      pricing,
      updatedByUserId: params.actorUserId,
      updatedAt: FieldValue.serverTimestamp(),
    });

  const updated = await fetchWorkOrder(params.companyId, params.workOrderId);
  if (!updated) {
    throw new Error("Could not load the work order");
  }
  return toDetail(updated, params.actorUserId);
}

export async function claimMobileWorkOrder(params: {
  companyId: string;
  workOrderId: string;
  actorUserId: string;
  actorName?: string;
  laborLineId?: string;
  scope?: DataScope;
}): Promise<MobileWorkOrderDetail> {
  const order = await fetchWorkOrder(params.companyId, params.workOrderId);
  if (!order) {
    throw new WorkOrderClaimError("Заказ-наряд не найден");
  }

  if (params.scope) {
    assertWorkOrderAccess(order, params.actorUserId, params.scope);
  }

  if (!canMechanicClaimWorkOrder(order, params.actorUserId)) {
    throw new WorkOrderClaimError("Нельзя взять этот наряд в работу");
  }

  const updated = await claimWorkOrderUseCase({
    companyId: params.companyId,
    workOrderId: params.workOrderId,
    actorUserId: params.actorUserId,
    actorName: params.actorName,
    laborLineId: params.laborLineId,
  });

  return toDetail(updated, params.actorUserId);
}

export async function addPartByBarcodeToMobileWorkOrder(params: {
  companyId: string;
  workOrderId: string;
  actorUserId: string;
  barcode: string;
  quantity?: number;
  scope?: DataScope;
}): Promise<MobileWorkOrderDetail> {
  const resolved = await resolveMobileScan(params.companyId, params.barcode);
  if (!resolved.found || !resolved.item) {
    throw new Error("No item found for that barcode");
  }

  return addPartToMobileWorkOrder({
    companyId: params.companyId,
    workOrderId: params.workOrderId,
    actorUserId: params.actorUserId,
    itemId: resolved.item.id,
    quantity: params.quantity,
    scope: params.scope,
  });
}
