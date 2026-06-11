import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { MotorEntity } from "@/domain/motor";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  createFinancialOperation,
  createWarrantyRecord,
  enqueueDocumentJob,
  updateMotorById,
} from "@/infrastructure/firestore/admin/work-order-effects-admin";
import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";
import { normalizeCompanyId } from "@/lib/company-id";
import { companyBrandingFromRecord } from "@/domain/company-branding";
import { parseCompanyDocumentConfig } from "@/domain/document-config";
import { canonicalWarrantyDuration } from "@/lib/documents/warranty/resolve-warranty";

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function processStandaloneMotorSold(params: {
  companyId: string;
  actorUserId: string;
  motor: Pick<MotorEntity, "id" | "serialCode" | "engineCode" | "brandName" | "configuration" | "localId">;
  amount: number;
  account: string;
  paymentMethod: string;
  comment?: string;
}): Promise<{ warrantyId: string | null; jobId: string | null; operationId: string | null }> {
  const existingWarranty = await fetchWarrantyByMotorId(params.companyId, params.motor.id);
  if (existingWarranty) {
    return { warrantyId: existingWarranty.id, jobId: "", operationId: null };
  }

  const soldAt = new Date();
  const companySnap = await getAdminFirestore()
    .collection("companies")
    .doc(normalizeCompanyId(params.companyId))
    .get();
  const companyData = (companySnap.data() ?? {}) as Record<string, unknown>;
  const branding = companyBrandingFromRecord(companyData);
  const documentConfig = parseCompanyDocumentConfig(companyData);
  const warrantyTemplateId = branding.warrantyTemplateId ?? documentConfig.warrantyTemplateId;
  const warrantyDuration = canonicalWarrantyDuration(warrantyTemplateId);
  const expiresAt = warrantyDuration ? addMonths(soldAt, warrantyDuration.months) : null;
  const motorDescription = [params.motor.brandName, params.motor.engineCode, params.motor.serialCode]
    .filter(Boolean)
    .join(" ");

  await updateMotorById(params.actorUserId, params.motor.id, {
    status: "sold",
    soldDate: Timestamp.fromDate(soldAt),
    reservedForWorkOrderId: null,
  });

  let operationId: string | null = null;
  if (params.amount > 0) {
    operationId = await createFinancialOperation(params.companyId, {
      type: "sale",
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      account: params.account,
      relatedMotorID: params.motor.localId ?? null,
      relatedMotorId: params.motor.id,
      comment: params.comment ?? "Продажа двигателя",
      description: motorDescription,
      category: MOTOR_SALE_CATEGORY,
      createdByUserId: params.actorUserId,
      id: `motor-sale:${params.motor.id}`,
    });
  }

  let warrantyId: string | null = null;
  let jobId: string | null = null;
  if (warrantyDuration && expiresAt) {
    const warranty = await createWarrantyRecord({
      companyId: params.companyId,
      motorId: params.motor.id,
      serialCode: params.motor.serialCode,
      engineCode: params.motor.engineCode,
      installedAt: soldAt,
      soldAt,
      expiresAt,
      expiresAtMileage: warrantyDuration.km,
      saleAmount: params.amount > 0 ? params.amount : undefined,
    });
    warrantyId = warranty.id;
    await updateMotorById(params.actorUserId, params.motor.id, { warrantyId: warranty.id });
    jobId = await enqueueDocumentJob({
      companyId: params.companyId,
      aggregateType: "warranty",
      aggregateId: warranty.id,
      slugs: ["engine-warranty", "engine-waybill", "invoice"],
    });
  }

  return { warrantyId, jobId, operationId };
}

export async function fetchWarrantyByMotorId(companyId: string, motorId: string) {
  const db = getAdminFirestore();
  const snap = await db
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("warranties")
    .where("motorId", "==", motorId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    verificationToken: String(data.verificationToken ?? ""),
    status: String(data.status ?? "active"),
    expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(),
    downloadUrl: typeof data.downloadUrl === "string" ? data.downloadUrl : undefined,
  };
}
