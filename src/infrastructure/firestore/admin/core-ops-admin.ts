import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { ClientEntity, CreateClientInput } from "@/domain/client";
import type { CreateFinancialOperationInput } from "@/domain/financial-operation";
import type { CreateVehicleInput, VehicleEntity } from "@/domain/vehicle";
import type { CreateWorkOrderInput, WorkOrder } from "@/domain/work-order";
import { buildOrderCreatedEvent } from "@/domain/work-order-state-machine";
import {
  createClientSchema,
  createFinancialOperationSchema,
  createVehicleSchema,
  createWorkOrderSchema,
} from "@/domain/schemas";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminWorkOrder } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";

async function allocateWorkOrderNumberAdmin(companyId: string): Promise<string> {
  const db = getAdminFirestore();
  const counterRef = db
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("meta")
    .doc("workOrderCounter");

  const next = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(counterRef);
    const current = snapshot.exists ? Number(snapshot.data()?.next ?? 1) : 1;
    if (!Number.isFinite(current) || current < 1) {
      throw new Error("Invalid work order counter");
    }
    tx.set(counterRef, { next: current + 1 }, { merge: true });
    return current;
  });
  return String(next);
}

export async function adminCreateClient(input: CreateClientInput): Promise<ClientEntity> {
  const validated = createClientSchema.parse({
    ...input,
    companyId: normalizeCompanyId(input.companyId),
  });
  const db = getAdminFirestore();
  const col = db.collection("companies").doc(validated.companyId).collection("clients");
  const ref = validated.id ? col.doc(validated.id) : col.doc();
  const { id: _id, ...payload } = validated;
  await ref.set({
    ...payload,
    email: payload.email || null,
    notes: payload.notes || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return {
    id: ref.id,
    companyId: validated.companyId,
    fullName: validated.fullName,
    phone: validated.phone,
    email: validated.email || undefined,
    notes: validated.notes || undefined,
    createdByUserId: validated.createdByUserId,
  };
}

export async function adminCreateVehicle(input: CreateVehicleInput): Promise<VehicleEntity> {
  const validated = createVehicleSchema.parse({
    ...input,
    companyId: normalizeCompanyId(input.companyId),
  });
  const db = getAdminFirestore();
  const col = db.collection("companies").doc(validated.companyId).collection("vehicles");
  const ref = validated.id ? col.doc(validated.id) : col.doc();
  const { id: _id, ...payload } = validated;
  await ref.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return {
    id: ref.id,
    companyId: validated.companyId,
    clientId: validated.clientId,
    make: validated.make ?? "",
    model: validated.model ?? "",
    year: validated.year,
    vin: validated.vin ?? "",
    licensePlate: validated.licensePlate ?? "",
    currentMileage: validated.currentMileage ?? 0,
    createdByUserId: validated.createdByUserId,
  };
}

export async function adminCreateWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrder> {
  const validated = createWorkOrderSchema.parse({
    ...input,
    companyId: normalizeCompanyId(input.companyId),
    status: input.status ?? "draft",
  });
  const db = getAdminFirestore();
  const col = db.collection("companies").doc(validated.companyId).collection("workOrders");
  const ref = validated.id ? col.doc(validated.id) : col.doc();
  const number = validated.number?.trim() || (await allocateWorkOrderNumberAdmin(validated.companyId));
  const { id: _id, ...payload } = validated;
  await ref.set({
    ...payload,
    number,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const snap = await ref.get();
  if (!snap.exists) throw new Error("Could not create work order");
  const order = mapAdminWorkOrder(snap.id, snap.data() as Record<string, unknown>);
  if (!order) throw new Error("Could not map created work order");

  const event = buildOrderCreatedEvent(order);
  const eventId = (event.id ?? event.idempotencyKey).replace(/[^a-zA-Z0-9_-]/g, "_");
  await db
    .collection("companies")
    .doc(validated.companyId)
    .collection("domainEvents")
    .doc(eventId)
    .set(
      {
        ...event,
        companyId: validated.companyId,
        status: event.status ?? "pending",
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return order;
}

export async function adminCreateFinancialOperation(
  input: CreateFinancialOperationInput,
): Promise<string> {
  const validated = createFinancialOperationSchema.parse({
    ...input,
    companyId: normalizeCompanyId(input.companyId),
  });
  const db = getAdminFirestore();
  const ref = db.collection("financialOperations").doc();
  await ref.set({
    ...validated,
    comment: validated.comment?.trim() || null,
    category: validated.category?.trim() || null,
    description: validated.description?.trim() || null,
    source: validated.source?.trim() || null,
    details: validated.details?.trim() || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function adminMarkMotorSold(params: {
  uid: string;
  motorId: string;
  companyId: string;
  serialCode: string;
  brandName?: string;
  engineCode?: string;
  configuration?: string;
  notes?: string;
  quantity?: number;
  transmission?: string;
  engineId?: number;
  localId?: number;
  arrivalDate?: Date | null;
  warrantyId?: string;
}): Promise<void> {
  const db = getAdminFirestore();
  const soldDate = new Date();
  await db
    .collection("users")
    .doc(params.uid)
    .collection("motors")
    .doc(params.motorId)
    .set(
      {
        companyId: normalizeCompanyId(params.companyId),
        localId: params.localId ?? (Number(params.motorId) || null),
        serialCode: params.serialCode,
        brandName: params.brandName ?? "",
        engineCode: params.engineCode ?? "",
        configuration: params.configuration ?? "",
        notes: params.notes ?? "",
        quantity: params.quantity ?? 1,
        transmission: params.transmission ?? "",
        engineId: params.engineId ?? null,
        arrivalDate: params.arrivalDate ?? soldDate,
        soldDate,
        status: "sold",
        warrantyId: params.warrantyId ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
