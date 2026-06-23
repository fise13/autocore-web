import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { MotorEntity, UpsertMotorInput } from "@/domain/motor";
import { upsertMotorSchema } from "@/domain/schemas";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  BrandEntity,
  EngineEntity,
} from "@/infrastructure/firestore/catalog-repository";
import { generateWebLocalId } from "@/infrastructure/firestore/motor-repository";
import {
  SpecificCategoryEntity,
  SpecificRecordEntity,
} from "@/infrastructure/firestore/specific-category-repository";
import {
  createDefaultColumnSchema,
  normalizeColumnSchema,
} from "@/lib/specific/specific-category-schema";
import { normalizeCompanyId } from "@/lib/company-id";
import { normalizeEngineCode } from "@/lib/motors/import-normalization";
import {
  scopedCategoryDocumentId,
  scopedRecordDocumentId,
} from "@/lib/specific/specific-sync-ids";

function readNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    const parsed = value.toDate();
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  return null;
}

function mapMotor(docId: string, data: Record<string, unknown>): MotorEntity | null {
  const localId = readNumber(data.localId ?? docId);
  const serialCode = String(data.serialCode ?? "").trim();
  const soldDate = toDate(data.soldDate);
  const rawStatus = typeof data.status === "string" ? data.status : "";
  const status = rawStatus || (soldDate ? "sold" : "available");
  if (!serialCode && !localId) return null;

  return {
    id: String(localId || docId),
    companyId: String(data.companyId ?? ""),
    localId: localId || undefined,
    engineId: readNumber(data.engineId) || undefined,
    serialCode,
    configuration: String(data.configuration ?? ""),
    notes: String(data.notes ?? ""),
    quantity: Number(data.quantity ?? 1),
    transmission: String(data.transmission ?? ""),
    arrivalDate: toDate(data.arrivalDate),
    soldDate,
    deletedAt: toDate(data.deletedAt),
    brandName: typeof data.brandName === "string" ? data.brandName : "",
    engineCode: typeof data.engineCode === "string" ? data.engineCode : "",
    status: status as MotorEntity["status"],
    reservedForWorkOrderId:
      typeof data.reservedForWorkOrderId === "string" ? data.reservedForWorkOrderId : null,
    installedOnVehicleId:
      typeof data.installedOnVehicleId === "string" ? data.installedOnVehicleId : null,
  };
}

function nextLocalId(items: { localId: number }[]): number {
  return items.reduce((acc, item) => Math.max(acc, item.localId), 0) + 1;
}

export type MotorImportServerContext = {
  existingMotors: MotorEntity[];
  existingBrands: BrandEntity[];
  existingEngines: EngineEntity[];
  existingSpecificCategories: SpecificCategoryEntity[];
};

export async function loadMotorImportServerContext(
  companyId: string,
  uid: string,
): Promise<MotorImportServerContext> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);

  const [groupSnap, userSnap, brandsSnap, enginesSnap, categoriesSnap] = await Promise.all([
    db.collectionGroup("motors").where("companyId", "==", normalizedCompanyId).get(),
    db.collection("users").doc(uid).collection("motors").get(),
    db.collection("brands").where("companyId", "==", normalizedCompanyId).get(),
    db.collection("engines").where("companyId", "==", normalizedCompanyId).get(),
    db.collection("specificCategories").where("companyId", "==", normalizedCompanyId).get(),
  ]);

  const motorsById = new Map<string, MotorEntity>();
  for (const doc of [...groupSnap.docs, ...userSnap.docs]) {
    const motor = mapMotor(doc.id, doc.data() as Record<string, unknown>);
    if (!motor) continue;
    motorsById.set(motor.id, motor);
  }

  const existingBrands = brandsSnap.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        localId: readNumber(data.localId ?? data.id),
        name: String(data.name ?? ""),
        companyId: String(data.companyId ?? normalizedCompanyId),
      };
    })
    .filter((item) => item.name.trim());

  const existingEngines = enginesSnap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      localId: readNumber(data.localId ?? data.id),
      brandLocalId: readNumber(data.brandLocalId ?? data.brandId),
      code: String(data.code ?? ""),
      companyId: String(data.companyId ?? normalizedCompanyId),
    };
  });

  const existingSpecificCategories = categoriesSnap.docs.map((item) => {
    const data = item.data() as Record<string, unknown>;
    const rawSchema = data.columnSchema;
    const columnSchema =
      Array.isArray(rawSchema) && rawSchema.length > 0
        ? normalizeColumnSchema(rawSchema as SpecificCategoryEntity["columnSchema"])
        : [];
    return {
      id: item.id,
      localId: readNumber(data.localId ?? data.id),
      name: String(data.name ?? ""),
      companyId: String(data.companyId ?? normalizedCompanyId),
      columnSchema,
    };
  });

  return {
    existingMotors: Array.from(motorsById.values()),
    existingBrands,
    existingEngines,
    existingSpecificCategories,
  };
}

export function createAdminMotorImportRepositories(uid: string, companyId: string) {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);

  function motorRef(motorId: string) {
    return db.collection("users").doc(uid).collection("motors").doc(motorId);
  }

  function buildMotorDocument(input: UpsertMotorInput, localId: number) {
    const payload: Record<string, unknown> = {
      companyId: normalizedCompanyId,
      localId,
      engineId: input.engineId ?? null,
      serialCode: input.serialCode.trim(),
      configuration: input.configuration ?? "",
      notes: input.notes ?? "",
      quantity: input.quantity ?? 1,
      transmission: input.transmission ?? "",
      soldDate: input.soldDate ?? null,
      deletedAt: input.deletedAt ?? null,
      brandName: (input.brandName ?? "").trim() || "Не указан",
      engineCode: (input.engineCode ?? "").trim() || "—",
      status: input.status ?? (input.soldDate ? "sold" : "available"),
      reservedForWorkOrderId: input.reservedForWorkOrderId ?? null,
      installedOnVehicleId: input.installedOnVehicleId ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (input.arrivalDate) payload.arrivalDate = input.arrivalDate;
    return payload;
  }

  const motorRepository = {
    async create(actorUid: string, input: UpsertMotorInput, existingMotors: MotorEntity[] = []) {
      void actorUid;
      const validated = upsertMotorSchema.parse({ ...input, companyId: normalizedCompanyId });
      const localId = validated.localId ?? generateWebLocalId(existingMotors);
      await motorRef(String(localId)).set(
        { ...buildMotorDocument(validated, localId), createdAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      return String(localId);
    },
    async update(actorUid: string, motorId: string, input: Partial<UpsertMotorInput>) {
      void actorUid;
      await motorRef(motorId).update({
        ...input,
        updatedAt: FieldValue.serverTimestamp(),
      });
    },
  };

  const catalogRepository = {
    async upsertBrand(_companyId: string, name: string, existingBrands: BrandEntity[]): Promise<BrandEntity> {
      const normalizedName = name.trim();
      const existing = existingBrands.find(
        (brand) => brand.name.localeCompare(normalizedName, "ru", { sensitivity: "accent" }) === 0,
      );
      if (existing) return existing;

      const localId = nextLocalId(existingBrands);
      const docId = `${normalizedCompanyId}_brand_${localId}`;
      await db.collection("brands").doc(docId).set(
        {
          companyId: normalizedCompanyId,
          localId,
          name: normalizedName,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return { id: docId, localId, name: normalizedName, companyId: normalizedCompanyId };
    },

    async upsertEngine(
      _companyId: string,
      brandLocalId: number,
      code: string,
      existingEngines: EngineEntity[],
    ): Promise<EngineEntity> {
      const normalizedCode = normalizeEngineCode(code);
      const existing = existingEngines.find(
        (engine) =>
          engine.brandLocalId === brandLocalId && normalizeEngineCode(engine.code) === normalizedCode,
      );
      if (existing) return existing;

      const localId = nextLocalId(existingEngines);
      const docId = `${normalizedCompanyId}_engine_${localId}`;
      await db.collection("engines").doc(docId).set(
        {
          companyId: normalizedCompanyId,
          localId,
          brandId: brandLocalId,
          brandLocalId,
          code: normalizedCode,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return { id: docId, localId, brandLocalId, code: normalizedCode, companyId: normalizedCompanyId };
    },
  };

  const specificCategoryRepository = {
    async upsertCategory(
      _companyId: string,
      name: string,
      existing: SpecificCategoryEntity[],
      actorUid?: string,
    ): Promise<SpecificCategoryEntity> {
      void actorUid;
      const trimmed = name.trim();
      const match = existing.find(
        (item) => item.name.localeCompare(trimmed, "ru", { sensitivity: "accent" }) === 0,
      );
      if (match) return match;

      const localId = nextLocalId(existing);
      const docId = scopedCategoryDocumentId(normalizedCompanyId, localId);
      const columnSchema = normalizeColumnSchema(createDefaultColumnSchema());
      await db.collection("specificCategories").doc(docId).set({
        companyId: normalizedCompanyId,
        localId,
        name: trimmed,
        columnSchema,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        id: docId,
        localId,
        name: trimmed,
        companyId: normalizedCompanyId,
        columnSchema,
      };
    },

    async replaceRecordsForCategory(
      _companyId: string,
      category: SpecificCategoryEntity,
      rows: Array<{ rowIndex: number; data: Record<string, string> }>,
      actorUid?: string,
    ) {
      void actorUid;
      const canonicalCategoryId = scopedCategoryDocumentId(normalizedCompanyId, category.localId);
      const existingSnap = await db
        .collection("specificRecords")
        .where("companyId", "==", normalizedCompanyId)
        .where("categoryLocalId", "==", category.localId)
        .get();

      const batch = db.batch();
      const keepIds = new Set(rows.map((row) => scopedRecordDocumentId(normalizedCompanyId, category.localId, row.rowIndex)));

      for (const item of existingSnap.docs) {
        if (!keepIds.has(item.id)) batch.delete(item.ref);
      }

      for (const row of rows) {
        const recordRef = db
          .collection("specificRecords")
          .doc(scopedRecordDocumentId(normalizedCompanyId, category.localId, row.rowIndex));
        batch.set(recordRef, {
          companyId: normalizedCompanyId,
          categoryId: canonicalCategoryId,
          categoryLocalId: category.localId,
          rowIndex: row.rowIndex,
          data: row.data,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
    },
  };

  return { motorRepository, catalogRepository, specificCategoryRepository };
}
