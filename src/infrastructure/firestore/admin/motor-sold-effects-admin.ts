import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { MotorEntity } from "@/domain/motor";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminMotor } from "@/infrastructure/firestore/admin-mappers";
import {
  createWarrantyRecord,
  enqueueDocumentJob,
  updateMotorById,
} from "@/infrastructure/firestore/admin/work-order-effects-admin";
import { companyBrandingFromRecord } from "@/domain/company-branding";
import { parseCompanyDocumentConfig, WarrantyTemplateId } from "@/domain/document-config";
import { canonicalWarrantyDuration } from "@/lib/documents/warranty/resolve-warranty";
import {
  MotorSaleWarrantyOverride,
  resolveCustomWarrantyDuration,
  resolveStoredWarrantyDays,
} from "@/lib/documents/warranty/custom-warranty";
import { getWarrantyTemplate } from "@/lib/documents/warranty/warranty-templates";
import { addDays } from "@/lib/documents/format";
import { normalizeCompanyId } from "@/lib/company-id";
import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";

type MotorSaleOperationContext = {
  operationId: string;
  amount: number;
  comment: string | null;
  relatedClientId: string | null;
  relatedWarrantyId: string | null;
  clientName: string | null;
};

function parseSaleComment(comment: string | null | undefined): { clientName: string | null } {
  if (!comment?.trim()) return { clientName: null };
  const parts = comment.split("·").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3 && parts[0].toLowerCase().includes("продаж")) {
    return { clientName: parts[parts.length - 1] ?? null };
  }
  return { clientName: null };
}

async function loadMotorForSale(
  companyId: string,
  motorId: string,
  ownerUserId: string,
): Promise<MotorEntity | null> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);

  const directSnap = await db
    .collection("users")
    .doc(ownerUserId)
    .collection("motors")
    .doc(motorId)
    .get();

  if (directSnap.exists) {
    const motor = mapAdminMotor(directSnap.id, directSnap.data() as Record<string, unknown>);
    if (motor && normalizeCompanyId(motor.companyId) === normalizedCompanyId) {
      return motor;
    }
  }

  const legacySnap = await db.collection("motors").doc(motorId).get();
  if (legacySnap.exists) {
    const motor = mapAdminMotor(legacySnap.id, legacySnap.data() as Record<string, unknown>);
    if (motor && normalizeCompanyId(motor.companyId) === normalizedCompanyId) {
      return motor;
    }
  }

  return null;
}

async function lookupMotorSaleOperation(
  companyId: string,
  motorId: string,
): Promise<MotorSaleOperationContext | null> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const snap = await db.collection("financialOperations").where("relatedMotorId", "==", motorId).get();

  const operations = snap.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        companyId: String(data.companyId ?? ""),
        amount: Number(data.amount ?? 0),
        comment: typeof data.comment === "string" ? data.comment : null,
        description: typeof data.description === "string" ? data.description : null,
        category: typeof data.category === "string" ? data.category : null,
        type: String(data.type ?? ""),
        relatedClientId: typeof data.relatedClientId === "string" ? data.relatedClientId : null,
        relatedWarrantyId: typeof data.relatedWarrantyId === "string" ? data.relatedWarrantyId : null,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : data.createdAt instanceof Date
              ? data.createdAt
              : new Date(0),
      };
    })
    .filter(
      (item) =>
        normalizeCompanyId(item.companyId) === normalizedCompanyId &&
        (item.category === MOTOR_SALE_CATEGORY || item.type === "sale"),
    )
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  const operation = operations[0];
  if (!operation) return null;

  const comment = operation.comment ?? operation.description;
  const parsed = parseSaleComment(comment);

  return {
    operationId: operation.id,
    amount: operation.amount,
    comment,
    relatedClientId: operation.relatedClientId,
    relatedWarrantyId: operation.relatedWarrantyId,
    clientName: parsed.clientName,
  };
}

async function patchMotorSaleOperationWarranty(
  operationId: string,
  warrantyId: string,
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection("financialOperations").doc(operationId).update({
    relatedWarrantyId: warrantyId,
    updatedAt: Timestamp.now(),
  });
}

function resolveMotorSaleWarrantyDuration(
  warrantyTemplateId: WarrantyTemplateId | "no_warranty" | undefined,
  brandingFields: {
    warrantyLabel?: string;
    warrantyText?: string;
    customWarrantyDays?: number;
    customWarrantyKm?: number;
  },
) {
  const duration = canonicalWarrantyDuration(warrantyTemplateId, undefined, brandingFields);
  if (duration) return duration;

  if (warrantyTemplateId === "no_warranty") {
    return { days: 1, km: 1, templateId: "no_warranty" as const };
  }

  const fallback = getWarrantyTemplate("contract_engine");
  return { days: fallback.days, km: fallback.km, templateId: "contract_engine" as const };
}

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
  const saleOperation = await lookupMotorSaleOperation(params.companyId, params.motor.id);

  if (saleOperation?.relatedWarrantyId) {
    return {
      warrantyId: saleOperation.relatedWarrantyId,
      jobId: "",
      operationId: saleOperation.operationId,
    };
  }

  const existingWarranty = await fetchWarrantyByMotorId(params.companyId, params.motor.id);
  if (existingWarranty) {
    if (saleOperation?.operationId) {
      await patchMotorSaleOperationWarranty(saleOperation.operationId, existingWarranty.id);
    }
    return { warrantyId: existingWarranty.id, jobId: "", operationId: saleOperation?.operationId ?? null };
  }

  const storedMotor = await loadMotorForSale(params.companyId, params.motor.id, params.actorUserId);
  const motor = {
    ...params.motor,
    serialCode: storedMotor?.serialCode ?? params.motor.serialCode,
    engineCode: storedMotor?.engineCode ?? params.motor.engineCode,
    brandName: storedMotor?.brandName ?? params.motor.brandName,
    configuration: storedMotor?.configuration ?? params.motor.configuration,
    localId: storedMotor?.localId ?? params.motor.localId,
  };

  const [clientId, companySnap] = await Promise.all([
    resolveMotorSaleClientId({
      companyId: params.companyId,
      actorUserId: params.actorUserId,
      clientId: params.clientId ?? saleOperation?.relatedClientId ?? undefined,
      clientName: params.clientName ?? saleOperation?.clientName ?? undefined,
      clientPhone: params.clientPhone,
      allowRecovery: Boolean(storedMotor?.soldDate ?? saleOperation),
    }),
    getAdminFirestore()
      .collection("companies")
      .doc(normalizeCompanyId(params.companyId))
      .get(),
  ]);

  const soldAt = storedMotor?.soldDate ?? new Date();
  const saleAmount = params.amount > 0 ? params.amount : (saleOperation?.amount ?? 0);
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

  const warrantyDuration = resolveMotorSaleWarrantyDuration(warrantyTemplateId, brandingFields);
  const expiresAt = addDays(soldAt, warrantyDuration.days);

  if (!storedMotor?.soldDate) {
    await updateMotorById(params.actorUserId, motor.id, {
      status: "sold",
      soldDate: Timestamp.fromDate(soldAt),
      reservedForWorkOrderId: null,
    });
  }

  const customPreset = getWarrantyTemplate("custom");
  const resolvedCustom =
    warrantyDuration.templateId === "custom"
      ? resolveCustomWarrantyDuration(
          brandingFields,
          customPreset.days,
          customPreset.km,
        )
      : null;
  const preset = getWarrantyTemplate(warrantyDuration.templateId);

  const warranty = await createWarrantyRecord({
    companyId: params.companyId,
    motorId: motor.id,
    clientId,
    soldByUserId: params.actorUserId,
    serialCode: motor.serialCode,
    engineCode: motor.engineCode,
    installedAt: soldAt,
    soldAt,
    expiresAt,
    expiresAtMileage: warrantyDuration.km,
    saleAmount: saleAmount > 0 ? saleAmount : undefined,
    warrantyLabel: resolvedCustom?.label ?? brandingFields.warrantyLabel ?? preset.name,
    termsText:
      resolvedCustom && resolvedCustom.paragraphs.length > 0
        ? resolvedCustom.paragraphs.join("\n")
        : preset.conditions.join("\n"),
    restrictionsText: preset.restrictions.join("\n"),
    warrantyDays: warrantyDuration.days,
    warrantyKm: warrantyDuration.km,
  });

  await updateMotorById(params.actorUserId, motor.id, { warrantyId: warranty.id });

  const jobId = await enqueueDocumentJob({
    companyId: params.companyId,
    aggregateType: "warranty",
    aggregateId: warranty.id,
    slugs: ["engine-warranty", "engine-waybill", "invoice"],
  });

  if (saleOperation?.operationId) {
    await patchMotorSaleOperationWarranty(saleOperation.operationId, warranty.id);
  }

  return {
    warrantyId: warranty.id,
    jobId,
    operationId: saleOperation?.operationId ?? null,
  };
}

async function resolveMotorSaleClientId(params: {
  companyId: string;
  actorUserId: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  allowRecovery?: boolean;
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

  if (fullName.length >= 2) {
    const byName = await clientsRef.where("fullName", "==", fullName).limit(1).get();
    if (!byName.empty) {
      return byName.docs[0].id;
    }
  }

  if (fullName.length >= 2 && phone.length >= 3) {
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

  if (fullName.length >= 2 && params.allowRecovery) {
    const created = await clientsRef.add({
      companyId: normalizeCompanyId(params.companyId),
      fullName,
      phone: "не указан",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdByUserId: params.actorUserId,
      updatedByUserId: params.actorUserId,
    });
    return created.id;
  }

  if (params.allowRecovery) {
    const recoveryName = "Покупатель";
    const existing = await clientsRef.where("fullName", "==", recoveryName).limit(1).get();
    if (!existing.empty) {
      return existing.docs[0].id;
    }

    const created = await clientsRef.add({
      companyId: normalizeCompanyId(params.companyId),
      fullName: recoveryName,
      phone: "не указан",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdByUserId: params.actorUserId,
      updatedByUserId: params.actorUserId,
    });
    return created.id;
  }

  throw new Error("Provide a buyer and a phone number");
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
