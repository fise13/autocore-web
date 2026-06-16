import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createHash, randomBytes } from "node:crypto";

import { DomainEvent, DomainEventType } from "@/domain/domain-event";
import { CreateWarrantyInput, EngineWarranty } from "@/domain/warranty";
import { WorkOrder } from "@/domain/work-order";
import { VehicleServiceHistoryEntry } from "@/domain/vehicle";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminWorkOrder } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";
import { summarizeWorkOrderForLogbook } from "@/lib/documents/classify-service-order";
import { WarrantyTemplateId, parseCompanyDocumentConfig } from "@/domain/document-config";
import { canonicalWarrantyDuration } from "@/lib/documents/warranty/resolve-warranty";
import { getWarrantyTemplate } from "@/lib/documents/warranty/warranty-templates";
import { processInventoryEventForWorkOrder } from "@/infrastructure/firestore/admin/inventory-effects-admin";
import { laborLinePayrollPerAssignee } from "@/lib/work-order/labor-pricing";

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function warrantyToken(): string {
  return randomBytes(16).toString("hex");
}

async function fetchCompanyDefaultWarrantyTemplate(companyId: string): Promise<WarrantyTemplateId | "no_warranty"> {
  const db = getAdminFirestore();
  const [companySnap, appConfigSnap] = await Promise.all([
    db.collection("companies").doc(normalizeCompanyId(companyId)).get(),
    db.collection("companies").doc(normalizeCompanyId(companyId)).collection("settings").doc("app").get(),
  ]);
  const appData = appConfigSnap.data() as { defaultWarrantyTemplate?: string } | undefined;
  if (appData?.defaultWarrantyTemplate === "no_warranty") {
    return "no_warranty";
  }
  if (appData?.defaultWarrantyTemplate && appData.defaultWarrantyTemplate !== "no_warranty") {
    return appData.defaultWarrantyTemplate as WarrantyTemplateId;
  }
  const documentConfig = parseCompanyDocumentConfig((companySnap.data() ?? {}) as Record<string, unknown>);
  return documentConfig.warrantyTemplateId ?? "contract_engine";
}

export async function fetchWorkOrder(companyId: string, workOrderId: string): Promise<WorkOrder | null> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("workOrders")
    .doc(workOrderId)
    .get();
  if (!snap.exists) return null;
  return mapAdminWorkOrder(snap.id, snap.data() as Record<string, unknown>);
}

export async function fetchPendingEvents(companyId: string, workOrderId: string): Promise<DomainEvent[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("domainEvents")
    .where("aggregateId", "==", workOrderId)
    .where("status", "==", "pending")
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      companyId: String(data.companyId ?? ""),
      type: data.type as DomainEventType,
      aggregateType: "work_order" as const,
      aggregateId: String(data.aggregateId ?? ""),
      payload: (data.payload as Record<string, unknown>) ?? {},
      idempotencyKey: String(data.idempotencyKey ?? doc.id),
      status: "pending" as const,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    };
  });
}

export async function markEventProcessed(companyId: string, eventId: string, error?: string) {
  const db = getAdminFirestore();
  await db
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("domainEvents")
    .doc(eventId)
    .update({
      status: error ? "failed" : "processed",
      processedAt: FieldValue.serverTimestamp(),
      ...(error ? { error } : {}),
    });
}

export async function updateMotorById(
  actorUserId: string,
  motorId: string,
  patch: Record<string, unknown>,
) {
  const db = getAdminFirestore();
  const ref = db.collection("users").doc(actorUserId).collection("motors").doc(motorId);
  const snap = await ref.get();
  if (!snap.exists) {
    const legacy = await db.collection("motors").doc(motorId).get();
    if (legacy.exists) {
      await legacy.ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
    }
    return;
  }
  await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
}

export async function appendVehicleServiceHistory(
  companyId: string,
  entry: Omit<VehicleServiceHistoryEntry, "id">,
) {
  const db = getAdminFirestore();
  const ref = db
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("vehicles")
    .doc(entry.vehicleId)
    .collection("serviceHistory")
    .doc(entry.workOrderId);

  await ref.set({
    ...entry,
    date: Timestamp.fromDate(entry.date),
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function createPayrollTransaction(
  companyId: string,
  input: {
    employeeId: string;
    workOrderId: string;
    laborLineId: string;
    role: string;
    amount: number;
    rateType: string;
    rate: number;
  },
) {
  const db = getAdminFirestore();
  const id = `payroll:${input.workOrderId}:${input.laborLineId}:${input.employeeId}`;
  const ref = db.collection("companies").doc(normalizeCompanyId(companyId)).collection("payrollTransactions").doc(id);
  const existing = await ref.get();
  if (existing.exists) return id;

  await ref.set({
    companyId: normalizeCompanyId(companyId),
    ...input,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });
  return id;
}

export async function createFinancialOperation(
  companyId: string,
  input: Record<string, unknown>,
) {
  const db = getAdminFirestore();
  const workOrderId = String(input.relatedWorkOrderId ?? "");
  const explicitId = typeof input.id === "string" ? input.id : "";
  const id =
    explicitId ||
    (workOrderId ? `wo-sale:${workOrderId}` : db.collection("financialOperations").doc().id);
  const ref = db.collection("financialOperations").doc(id);
  const existing = await ref.get();
  if (existing.exists) return id;

  const { id: _ignored, ...payload } = input;

  await ref.set({
    companyId: normalizeCompanyId(companyId),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...payload,
  });
  return id;
}

export async function createWarrantyRecord(input: CreateWarrantyInput): Promise<EngineWarranty> {
  const db = getAdminFirestore();
  const id = input.id ?? db.collection("companies").doc(input.companyId).collection("warranties").doc().id;
  const ref = db.collection("companies").doc(normalizeCompanyId(input.companyId)).collection("warranties").doc(id);

  const token = input.verificationToken || warrantyToken();
  const payload = {
    ...input,
    companyId: normalizeCompanyId(input.companyId),
    verificationToken: token,
    status: input.status ?? "active",
    installedAt: Timestamp.fromDate(input.installedAt),
    expiresAt: Timestamp.fromDate(input.expiresAt),
    ...(input.soldAt ? { soldAt: Timestamp.fromDate(input.soldAt) } : {}),
    createdAt: FieldValue.serverTimestamp(),
  };

  await ref.set(payload);

  return {
    id,
    companyId: normalizeCompanyId(input.companyId),
    motorId: input.motorId,
    vehicleId: input.vehicleId,
    workOrderId: input.workOrderId,
    clientId: input.clientId,
    serialCode: input.serialCode,
    engineCode: input.engineCode,
    vin: input.vin,
    licensePlate: input.licensePlate,
    installedAt: input.installedAt,
    soldAt: input.soldAt,
    expiresAt: input.expiresAt,
    expiresAtMileage: input.expiresAtMileage,
    termsText: input.termsText,
    restrictionsText: input.restrictionsText,
    warrantyLabel: input.warrantyLabel,
    warrantyMonths: input.warrantyMonths,
    warrantyKm: input.warrantyKm,
    verificationToken: token,
    status: input.status ?? "active",
    createdAt: new Date(),
  };
}

export async function processWorkOrderEvent(
  order: WorkOrder,
  event: DomainEvent,
  actorUserId: string,
): Promise<void> {
  const companyId = order.companyId;

  switch (event.type) {
    case "EngineReserved": {
      const motorId = String(event.payload.motorId ?? "");
      if (!motorId) break;
      await updateMotorById(actorUserId, motorId, {
        status: "reserved",
        reservedForWorkOrderId: order.id,
      });
      break;
    }
    case "EngineReleased": {
      const motorId = String(event.payload.motorId ?? "");
      if (!motorId) break;
      await updateMotorById(actorUserId, motorId, {
        status: "available",
        reservedForWorkOrderId: null,
      });
      break;
    }
    case "EngineInstalled": {
      const motorId = String(event.payload.motorId ?? "");
      if (!motorId) break;
      await updateMotorById(actorUserId, motorId, {
        status: "installed",
        installedOnVehicleId: order.vehicleId || null,
        installedWorkOrderId: order.id,
        reservedForWorkOrderId: null,
      });
      break;
    }
    case "EngineSold": {
      const motorId = String(event.payload.motorId ?? "");
      if (!motorId) break;
      await updateMotorById(actorUserId, motorId, {
        status: "sold",
        soldDate: Timestamp.fromDate(new Date()),
        installedWorkOrderId: order.id,
        reservedForWorkOrderId: null,
      });
      break;
    }
    case "InventoryReserved":
    case "InventoryDeducted":
    case "InventoryReleased": {
      await processInventoryEventForWorkOrder(order, event.type, event.payload, actorUserId);
      break;
    }
    case "SalaryCalculated": {
      for (const line of order.laborLines) {
        const amount = laborLinePayrollPerAssignee(line);
        if (amount <= 0) continue;
        for (const assigneeId of line.assigneeIds) {
          await createPayrollTransaction(companyId, {
            employeeId: assigneeId,
            workOrderId: order.id,
            laborLineId: line.id,
            role: line.assigneeRole,
            amount,
            rateType: line.pricingMode === "hourly" ? "hourly" : "fixed",
            rate: line.unitPrice,
          });
        }
      }
      break;
    }
    case "FinancialTransactionCreated": {
      if (order.pricing.grandTotal <= 0) break;
      await createFinancialOperation(companyId, {
        type: "sale",
        amount: order.pricing.grandTotal,
        paymentMethod: order.paymentMethod ?? "cash",
        account: order.paymentAccount ?? "cashbox",
        relatedWorkOrderId: order.id,
        comment: `Заказ-наряд №${order.number}`,
        description: order.vehicleLabel ?? order.clientName ?? "",
        createdByUserId: actorUserId,
        category: "work_order",
      });
      break;
    }
    case "VehicleHistoryRecorded": {
      if (!order.vehicleId) break;
      const motorLine = order.motorLines.find((line) => line.outcome === "install") ?? order.motorLines[0];
      await appendVehicleServiceHistory(companyId, {
        companyId,
        vehicleId: order.vehicleId,
        workOrderId: order.id,
        date: order.completedAt ?? new Date(),
        workTypes: [summarizeWorkOrderForLogbook(order)],
        motorId: motorLine?.motorId,
        mileage: order.mileage,
        documentIds: [],
      });
      break;
    }
    case "WarrantyActivated": {
      const companyDefault = await fetchCompanyDefaultWarrantyTemplate(companyId);
      const installedAt = order.completedAt ?? new Date();

      for (const line of order.motorLines) {
        const duration = canonicalWarrantyDuration(
          companyDefault,
          line.warrantyTemplateId ?? companyDefault,
        );
        if (!duration) continue;

        const preset = getWarrantyTemplate(duration.templateId);
        const expiresAt = addMonths(installedAt, duration.months);
        const warranty = await createWarrantyRecord({
          companyId,
          motorId: line.motorId,
          vehicleId: order.vehicleId,
          workOrderId: order.id,
          clientId: order.clientId,
          serialCode: line.serialCode,
          engineCode: line.engineCode,
          vin: order.vin,
          licensePlate: order.licensePlate,
          installedAt,
          soldAt: line.outcome === "sell" ? installedAt : undefined,
          expiresAt,
          expiresAtMileage: (order.mileage || 0) + duration.km,
          termsText: preset.conditions.join("\n"),
          restrictionsText: preset.restrictions.join("\n"),
          verificationToken: warrantyToken(),
        });
        await updateMotorById(actorUserId, line.motorId, { warrantyId: warranty.id });
      }

      for (const line of order.partLines.filter((part) => part.source === "specific_quick")) {
        const lineTemplate =
          line.warrantyTemplateId === "none"
            ? "no_warranty"
            : (line.warrantyTemplateId as WarrantyTemplateId | undefined);
        const duration = canonicalWarrantyDuration(companyDefault, lineTemplate);
        if (!duration) continue;

        const preset = getWarrantyTemplate(duration.templateId);
        const expiresAt = addMonths(installedAt, duration.months);
        await createWarrantyRecord({
          companyId,
          motorId: `specific:${line.id}`,
          vehicleId: order.vehicleId,
          workOrderId: order.id,
          clientId: order.clientId,
          serialCode: line.name,
          engineCode: line.specificCategoryName,
          vin: order.vin,
          licensePlate: order.licensePlate,
          installedAt,
          soldAt: installedAt,
          saleAmount: line.unitPrice * line.quantity,
          expiresAt,
          expiresAtMileage: (order.mileage || 0) + duration.km,
          termsText: preset.conditions.join("\n"),
          restrictionsText: preset.restrictions.join("\n"),
          verificationToken: warrantyToken(),
        });
      }
      break;
    }
    case "DocumentsGenerated":
      break;
    default:
      break;
  }
}

export function contextSnapshotHash(order: WorkOrder): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        status: order.status,
        laborLines: order.laborLines,
        partLines: order.partLines,
        motorLines: order.motorLines,
        pricing: order.pricing,
        mileage: order.mileage,
      }),
    )
    .digest("hex")
    .slice(0, 16);
}

export async function enqueueDocumentJob(params: {
  companyId: string;
  aggregateType: "work_order" | "quote" | "warranty";
  aggregateId: string;
  slugs: string[];
  triggerEventId?: string;
}) {
  const db = getAdminFirestore();
  const ref = db
    .collection("companies")
    .doc(normalizeCompanyId(params.companyId))
    .collection("documentGenerationJobs")
    .doc();

  await ref.set({
    companyId: normalizeCompanyId(params.companyId),
    aggregateType: params.aggregateType,
    aggregateId: params.aggregateId,
    requestedSlugs: params.slugs,
    completedSlugs: [],
    triggerEventId: params.triggerEventId ?? null,
    status: "pending",
    attempts: 0,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
