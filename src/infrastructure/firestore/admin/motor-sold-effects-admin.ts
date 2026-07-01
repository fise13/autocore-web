import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { MotorEntity } from "@/domain/motor";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  createWarrantyRecord,
  enqueueDocumentJob,
  updateMotorById,
} from "@/infrastructure/firestore/admin/work-order-effects-admin";
import { companyBrandingFromRecord } from "@/domain/company-branding";
import { parseCompanyDocumentConfig } from "@/domain/document-config";
import { canonicalWarrantyDuration } from "@/lib/documents/warranty/resolve-warranty";
import {
  MotorSaleWarrantyOverride,
  resolveCustomWarrantyDuration,
  resolveStoredWarrantyDays,
} from "@/lib/documents/warranty/custom-warranty";
import { getWarrantyTemplate } from "@/lib/documents/warranty/warranty-templates";
import { addDays } from "@/lib/documents/format";
import { normalizeCompanyId } from "@/lib/company-id";

export async function processStandaloneMotorSold(params: {
  companyId: string;
  actorUserId: string;
  motor: Pick<MotorEntity, "id" | "serialCode" | "engineCode" | "brandName" | "configuration" | "localId">;
  amount: number;
  account: string;
  paymentMethod: string;
  comment?: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  warrantyOverride?: MotorSaleWarrantyOverride;
}): Promise<{ warrantyId: string | null; jobId: string | null; operationId: string | null }> {
  const existingWarranty = await fetchWarrantyByMotorId(params.companyId, params.motor.id);
  if (existingWarranty) {
    return { warrantyId: existingWarranty.id, jobId: "", operationId: null };
  }

  const clientId = await resolveMotorSaleClientId({
    companyId: params.companyId,
    actorUserId: params.actorUserId,
    clientId: params.clientId,
    clientName: params.clientName,
    clientPhone: params.clientPhone,
  });

  const soldAt = new Date();
  const companySnap = await getAdminFirestore()
    .collection("companies")
    .doc(normalizeCompanyId(params.companyId))
    .get();
  const companyData = (companySnap.data() ?? {}) as Record<string, unknown>;
  const branding = companyBrandingFromRecord(companyData);
  const documentConfig = parseCompanyDocumentConfig(companyData);
  const warrantyTemplateId = branding.warrantyTemplateId ?? documentConfig.warrantyTemplateId;

  const brandingFields = {
    warrantyLabel: params.warrantyOverride?.warrantyLabel ?? branding.warrantyLabel,
    warrantyText: params.warrantyOverride?.warrantyText ?? branding.warrantyText,
    customWarrantyDays:
      params.warrantyOverride?.customWarrantyDays ??
      resolveStoredWarrantyDays(
        documentConfig.customWarrantyDays,
        params.warrantyOverride?.customWarrantyMonths,
      ),
    customWarrantyKm: params.warrantyOverride?.customWarrantyKm ?? documentConfig.customWarrantyKm,
  };

  const warrantyDuration = canonicalWarrantyDuration(warrantyTemplateId, undefined, brandingFields);
  const expiresAt = warrantyDuration ? addDays(soldAt, warrantyDuration.days) : null;

  await updateMotorById(params.actorUserId, params.motor.id, {
    status: "sold",
    soldDate: Timestamp.fromDate(soldAt),
    reservedForWorkOrderId: null,
  });

  let warrantyId: string | null = null;
  let jobId: string | null = null;
  if (warrantyDuration && expiresAt) {
    const customPreset = getWarrantyTemplate("custom");
    const resolvedCustom =
      warrantyTemplateId === "custom"
        ? resolveCustomWarrantyDuration(
            brandingFields,
            customPreset.days,
            customPreset.km,
          )
        : null;
    const preset = getWarrantyTemplate(warrantyDuration.templateId);

    const warranty = await createWarrantyRecord({
      companyId: params.companyId,
      motorId: params.motor.id,
      clientId,
      soldByUserId: params.actorUserId,
      serialCode: params.motor.serialCode,
      engineCode: params.motor.engineCode,
      installedAt: soldAt,
      soldAt,
      expiresAt,
      expiresAtMileage: warrantyDuration.km,
      saleAmount: params.amount > 0 ? params.amount : undefined,
      warrantyLabel: resolvedCustom?.label ?? brandingFields.warrantyLabel,
      termsText:
        resolvedCustom && resolvedCustom.paragraphs.length > 0
          ? resolvedCustom.paragraphs.join("\n")
          : preset.conditions.join("\n"),
      restrictionsText: preset.restrictions.join("\n"),
      warrantyDays: warrantyDuration.days,
      warrantyKm: warrantyDuration.km,
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

  return { warrantyId, jobId, operationId: null };
}

async function resolveMotorSaleClientId(params: {
  companyId: string;
  actorUserId: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
}): Promise<string> {
  const db = getAdminFirestore();
  const companyRef = db.collection("companies").doc(normalizeCompanyId(params.companyId));
  const clientsRef = companyRef.collection("clients");

  if (params.clientId?.trim()) {
    const existing = await clientsRef.doc(params.clientId.trim()).get();
    if (existing.exists) {
      return existing.id;
    }
  }

  const fullName = params.clientName?.trim() ?? "";
  const phone = params.clientPhone?.trim() ?? "";
  if (fullName.length < 2 || phone.length < 3) {
    throw new Error("Укажите покупателя и телефон");
  }

  const byPhone = await clientsRef.where("phone", "==", phone).limit(1).get();
  if (!byPhone.empty) {
    return byPhone.docs[0].id;
  }

  const created = await clientsRef.add({
    companyId: normalizeCompanyId(params.companyId),
    fullName,
    phone,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdByUserId: params.actorUserId,
    updatedByUserId: params.actorUserId,
  });

  return created.id;
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
