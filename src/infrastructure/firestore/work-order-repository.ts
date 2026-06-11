import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  WorkOrder,
  WorkOrderStatus,
} from "@/domain/work-order";
import { createWorkOrderSchema } from "@/domain/schemas";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { formatWorkOrderActivityName } from "@/lib/work-order/work-order-display";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";
import { stripUndefinedDeep } from "@/lib/firestore/strip-undefined";

const COLLECTION = "workOrders";

function mapWorkOrder(id: string, data: Record<string, unknown>): WorkOrder {
  const createdAt = toDateFromFirestore(data.createdAt) ?? new Date();
  return {
    id,
    companyId: String(data.companyId ?? ""),
    number: String(data.number ?? id),
    status: (data.status as WorkOrderStatus) ?? "draft",
    clientId: String(data.clientId ?? ""),
    clientName: typeof data.clientName === "string" ? data.clientName : undefined,
    clientPhone: typeof data.clientPhone === "string" ? data.clientPhone : undefined,
    vehicleId: String(data.vehicleId ?? ""),
    vehicleLabel: typeof data.vehicleLabel === "string" ? data.vehicleLabel : undefined,
    vin: String(data.vin ?? ""),
    licensePlate: String(data.licensePlate ?? ""),
    mileage: Number(data.mileage ?? 0),
    comment: typeof data.comment === "string" ? data.comment : undefined,
    laborLines: Array.isArray(data.laborLines) ? (data.laborLines as WorkOrder["laborLines"]) : [],
    partLines: Array.isArray(data.partLines) ? (data.partLines as WorkOrder["partLines"]) : [],
    motorLines: Array.isArray(data.motorLines) ? (data.motorLines as WorkOrder["motorLines"]) : [],
    pricing:
      typeof data.pricing === "object" && data.pricing != null
        ? (data.pricing as WorkOrder["pricing"])
        : { laborTotal: 0, partsTotal: 0, motorsTotal: 0, discount: 0, grandTotal: 0 },
    paymentAccount: data.paymentAccount as WorkOrder["paymentAccount"],
    paymentMethod: data.paymentMethod as WorkOrder["paymentMethod"],
    createdByUserId: String(data.createdByUserId ?? ""),
    updatedByUserId: typeof data.updatedByUserId === "string" ? data.updatedByUserId : undefined,
    createdAt,
    updatedAt: toDateFromFirestore(data.updatedAt) ?? createdAt,
    confirmedAt: toDateFromFirestore(data.confirmedAt) ?? undefined,
    completedAt: toDateFromFirestore(data.completedAt) ?? undefined,
    deliveredAt: toDateFromFirestore(data.deliveredAt) ?? undefined,
    cancelledAt: toDateFromFirestore(data.cancelledAt) ?? undefined,
  };
}

function workOrdersRef(companyId: string) {
  return collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION);
}

function workOrderRef(companyId: string, workOrderId: string) {
  return doc(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION, workOrderId);
}

function workOrderCounterRef(companyId: string) {
  return doc(getFirestoreDb(), "companies", normalizeCompanyId(companyId), "meta", "workOrderCounter");
}

async function allocateWorkOrderNumber(companyId: string): Promise<string> {
  const db = getFirestoreDb();
  const counterRef = workOrderCounterRef(companyId);
  const next = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const current = snapshot.exists() ? Number(snapshot.data()?.next ?? 1) : 1;
    if (!Number.isFinite(current) || current < 1) {
      throw new Error("Invalid work order counter");
    }
    transaction.set(counterRef, { next: current + 1 }, { merge: true });
    return current;
  });
  return String(next);
}

function timestampFieldForStatus(status: WorkOrderStatus) {
  if (status === "confirmed") return "confirmedAt";
  if (status === "completed") return "completedAt";
  if (status === "delivered") return "deliveredAt";
  if (status === "cancelled") return "cancelledAt";
  return null;
}

export type WorkOrderRepository = ReturnType<typeof createWorkOrderRepository>;

export function createWorkOrderRepository() {
  const activity = createActivityLogRepository();

  return {
    subscribe(
      companyId: string,
      onData: (orders: WorkOrder[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }

      const q = query(workOrdersRef(companyId), orderBy("updatedAt", "desc"), limit(200));
      return onSnapshot(
        q,
        (snapshot) => {
          onData(snapshot.docs.map((item) => mapWorkOrder(item.id, item.data() as Record<string, unknown>)));
        },
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async getById(companyId: string, workOrderId: string): Promise<WorkOrder | null> {
      const snapshot = await getDoc(workOrderRef(companyId, workOrderId));
      if (!snapshot.exists()) return null;
      return mapWorkOrder(snapshot.id, snapshot.data() as Record<string, unknown>);
    },

    async create(input: CreateWorkOrderInput): Promise<WorkOrder> {
      const validated = createWorkOrderSchema.parse({
        ...input,
        companyId: normalizeCompanyId(input.companyId),
        status: input.status ?? "draft",
      });
      const targetRef = validated.id
        ? workOrderRef(validated.companyId, validated.id)
        : doc(workOrdersRef(validated.companyId));
      const number =
        validated.number?.trim() || (await allocateWorkOrderNumber(validated.companyId));

      const payload: Record<string, unknown> = { ...validated };
      delete payload.id;
      await setDoc(
        targetRef,
        stripUndefinedDeep({
          ...payload,
          number,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );

      await activity.append(validated.companyId, {
        actor: validated.createdByUserId,
        action: "work_order.created",
        module: "work_orders",
        target: `workOrder:${targetRef.id}`,
        targetId: targetRef.id,
        targetName: formatWorkOrderActivityName({ number, id: targetRef.id }),
      });

      const snapshot = await getDoc(targetRef);
      if (!snapshot.exists()) throw new Error("Не удалось создать заказ-наряд");
      return mapWorkOrder(snapshot.id, snapshot.data() as Record<string, unknown>);
    },

    async update(companyId: string, workOrderId: string, input: UpdateWorkOrderInput) {
      await updateDoc(
        workOrderRef(companyId, workOrderId),
        stripUndefinedDeep({
          ...input,
          updatedAt: serverTimestamp(),
        }),
      );
    },

    async updateStatus(
      companyId: string,
      workOrderId: string,
      status: WorkOrderStatus,
      actorUserId: string,
    ) {
      const timestampField = timestampFieldForStatus(status);
      await updateDoc(workOrderRef(companyId, workOrderId), {
        status,
        updatedByUserId: actorUserId,
        updatedAt: serverTimestamp(),
        ...(timestampField ? { [timestampField]: serverTimestamp() } : {}),
      });
      try {
        await activity.append(companyId, {
          actor: actorUserId,
          action: `work_order.status.${status}`,
          module: "work_orders",
          target: `workOrder:${workOrderId}`,
          targetId: workOrderId,
        });
      } catch (activityError) {
        console.warn("Activity log skipped for work order status change:", activityError);
      }
    },

    docRef: workOrderRef,
    collectionRef: workOrdersRef,
    mapWorkOrder,
  };
}
