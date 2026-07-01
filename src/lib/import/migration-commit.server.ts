import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { UpsertInventoryItemInput } from "@/domain/inventory";
import type { MotorEntity } from "@/domain/motor";
import { upsertInventoryItemSchema, upsertMotorSchema } from "@/domain/schemas";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { defaultWarehouseDocId } from "@/lib/warehouse/default-warehouse-id";
import { normalizeInventoryTaxonomyInput } from "@/lib/warehouse/inventory-taxonomy-normalize";
import { applyMovementToStock, computeAvailable } from "@/lib/warehouse/movement-logic";
import { buildInventorySearchTokens } from "@/lib/warehouse/warehouse-search";
import { stockLevelDocumentId } from "@/lib/warehouse/warehouse-sync-ids";

import {
  buildInventoryInputFromMigrationRow,
  buildMotorInputFromMigrationRow,
  isMigrationCatalogRecordType,
} from "./migration-row-builders";
import {
  createMigrationSpecificCategoryCache,
  persistMigrationSpecificRowAdmin,
  type SpecificCategoryCache,
} from "./migration-specific-commit.server";
import type { SpecificCategoryEntity } from "@/domain/specific-category";
import type { DuplicateGroup, ReviewRow } from "@/components/migration/migration-types";
import type { RecordType } from "./types";
import { RECORD_TYPE_LABELS } from "./types";

export type MigrationBatchResult = {
  imported: Array<{ type: RecordType; label: string; count: number }>;
  updated: number;
  skipped: number;
  errors: number;
  skuCache: Record<string, string>;
};

function generateWebLocalId(existingMotors: MotorEntity[]): number {
  const used = new Set(
    existingMotors
      .map((motor) => motor.localId ?? Number(motor.id))
      .filter((value) => Number.isFinite(value)),
  );
  let candidate = -Math.floor(Date.now() % 2_000_000_000);
  while (used.has(candidate)) {
    candidate -= 1;
  }
  return candidate;
}

function shouldSkipDuplicate(row: ReviewRow, duplicates: DuplicateGroup[]): boolean {
  for (const group of duplicates) {
    if (!group.rowIds.includes(row.id)) continue;
    if (group.resolution === "skip") return true;
  }
  return false;
}

function shouldUpdateDuplicate(row: ReviewRow, duplicates: DuplicateGroup[]): boolean {
  for (const group of duplicates) {
    if (!group.rowIds.includes(row.id)) continue;
    if (group.resolution === "update") return true;
  }
  return false;
}

function parseQuantity(raw: string | undefined): number {
  if (!raw?.trim()) return 1;
  const parsed = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
}

export async function ensureMigrationWarehouseAdmin(companyId: string, actorUserId: string): Promise<string> {
  const db = getAdminFirestore();
  const normalized = normalizeCompanyId(companyId);
  const docId = defaultWarehouseDocId(companyId);
  const ref = db.collection("warehouses").doc(docId);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      companyId: normalized,
      name: "Основной склад",
      code: "MAIN",
      isDefault: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const existing = await db
    .collection("warehouses")
    .where("companyId", "==", normalized)
    .where("isDefault", "==", true)
    .limit(1)
    .get();

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  return docId;
}

async function loadExistingMotorsAdmin(uid: string): Promise<MotorEntity[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("users").doc(uid).collection("motors").get();
  const motors: MotorEntity[] = [];
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const serialCode = String(data.serialCode ?? "").trim();
    const localId = Number(data.localId ?? docSnap.id);
    if (!serialCode && !Number.isFinite(localId)) continue;
    motors.push({
      id: String(Number.isFinite(localId) ? localId : docSnap.id),
      companyId: String(data.companyId ?? ""),
      localId: Number.isFinite(localId) ? localId : undefined,
      serialCode,
      configuration: String(data.configuration ?? ""),
      notes: String(data.notes ?? ""),
      quantity: Number(data.quantity ?? 1),
      transmission: String(data.transmission ?? ""),
      arrivalDate: null,
    });
  }
  return motors;
}

function motorIndexBySerial(motors: MotorEntity[]): Map<string, MotorEntity> {
  const map = new Map<string, MotorEntity>();
  for (const motor of motors) {
    const key = motor.serialCode.trim().toLowerCase();
    if (key) map.set(key, motor);
  }
  return map;
}

async function createInventoryItemAdmin(
  input: UpsertInventoryItemInput,
  itemId?: string,
): Promise<string> {
  const db = getAdminFirestore();
  const normalized = normalizeInventoryTaxonomyInput(input);
  const parsed = upsertInventoryItemSchema.parse(normalized);
  const companyId = normalizeCompanyId(parsed.companyId);
  const searchTokens = buildInventorySearchTokens(parsed as UpsertInventoryItemInput);

  const payload: Record<string, unknown> = {
    companyId,
    type: parsed.type ?? "generic",
    sku: parsed.sku.trim(),
    name: parsed.name.trim(),
    barcodes: parsed.barcodes ?? [],
    unit: parsed.unit ?? "шт",
    currency: parsed.currency ?? "KZT",
    status: parsed.status ?? "active",
    inventoryGroup: normalized.inventoryGroup ?? parsed.inventoryGroup ?? "consumables",
    searchTokens,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (parsed.brandName) payload.brandName = parsed.brandName;
  if (parsed.warehouseLocation) payload.warehouseLocation = parsed.warehouseLocation;
  if (parsed.notes) payload.notes = parsed.notes;
  if (normalized.subcategoryId ?? parsed.subcategoryId) {
    payload.subcategoryId = normalized.subcategoryId ?? parsed.subcategoryId;
  }
  if (parsed.purchasePrice != null) payload.purchasePrice = parsed.purchasePrice;
  if (parsed.sellPrice != null) payload.sellPrice = parsed.sellPrice;
  if (parsed.actorUserId) payload.updatedByUserId = parsed.actorUserId;

  if (itemId) {
    await db.collection("inventoryItems").doc(itemId).set(payload, { merge: true });
    return itemId;
  }

  const created = await db.collection("inventoryItems").add({
    ...payload,
    totalOnHand: 0,
    totalReserved: 0,
    totalAvailable: 0,
    stockValue: 0,
    createdAt: FieldValue.serverTimestamp(),
    createdByUserId: parsed.actorUserId,
  });
  return created.id;
}

async function receiveStockAdmin(params: {
  companyId: string;
  itemId: string;
  warehouseId: string;
  quantity: number;
  unitCost?: number;
  actorUserId: string;
  idempotencyKey: string;
}): Promise<void> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(params.companyId);

  const existing = await db
    .collection("inventoryMovements")
    .where("companyId", "==", normalizedCompanyId)
    .where("idempotencyKey", "==", params.idempotencyKey)
    .limit(1)
    .get();
  if (!existing.empty) return;

  const itemSnap = await db.collection("inventoryItems").doc(params.itemId).get();
  if (!itemSnap.exists) throw new Error("Позиция не найдена");

  const itemData = itemSnap.data() as Record<string, unknown>;
  const unitCost = params.unitCost ?? Number(itemData.averageCost ?? itemData.purchasePrice ?? 0);
  const stockRef = db
    .collection("inventoryStockLevels")
    .doc(stockLevelDocumentId(params.itemId, params.warehouseId));
  const movementRef = db.collection("inventoryMovements").doc();

  await db.runTransaction(async (transaction) => {
    const stockSnap = await transaction.get(stockRef);
    const itemRef = db.collection("inventoryItems").doc(params.itemId);
    const itemDoc = await transaction.get(itemRef);

    const stockData = stockSnap.exists ? (stockSnap.data() as Record<string, unknown>) : null;
    const beforeOnHand = Number(stockData?.onHand ?? 0);
    const beforeReserved = Number(stockData?.reserved ?? 0);

    const { next } = applyMovementToStock(
      {
        onHand: beforeOnHand,
        reserved: beforeReserved,
        available: computeAvailable(beforeOnHand, beforeReserved),
      },
      "receipt",
      params.quantity,
    );

    transaction.set(
      stockRef,
      {
        companyId: normalizedCompanyId,
        itemId: params.itemId,
        warehouseId: params.warehouseId,
        onHand: next.onHand,
        reserved: next.reserved,
        available: next.available,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(movementRef, {
      companyId: normalizedCompanyId,
      itemId: params.itemId,
      warehouseId: params.warehouseId,
      type: "receipt",
      quantity: params.quantity,
      unitCost,
      totalCost: unitCost * params.quantity,
      beforeOnHand,
      afterOnHand: next.onHand,
      beforeReserved,
      afterReserved: next.reserved,
      referenceType: "import",
      idempotencyKey: params.idempotencyKey,
      actorUserId: params.actorUserId,
      createdAt: FieldValue.serverTimestamp(),
    });

    const docData = itemDoc.data() as Record<string, unknown> | undefined;
    const totalOnHand = Number(docData?.totalOnHand ?? 0) + params.quantity;
    const totalReserved = Number(docData?.totalReserved ?? 0);
    transaction.update(itemRef, {
      totalOnHand,
      totalReserved,
      totalAvailable: totalOnHand - totalReserved,
      stockValue: totalOnHand * unitCost,
      averageCost: unitCost,
      purchasePrice: unitCost,
      updatedAt: FieldValue.serverTimestamp(),
      updatedByUserId: params.actorUserId,
    });
  });
}

async function persistMigrationRowAdmin(params: {
  uid: string;
  companyId: string;
  warehouseId: string;
  row: ReviewRow;
  skuCache: Map<string, string>;
  existingMotors: MotorEntity[];
  motorsBySerial: Map<string, MotorEntity>;
  updateExisting: boolean;
  specificCategoryCache: SpecificCategoryCache;
  specificCategories: SpecificCategoryEntity[];
}): Promise<{ created: boolean; updated: boolean; motorAdded: boolean }> {
  const { uid, companyId, row, warehouseId, skuCache, updateExisting } = params;
  let { existingMotors, motorsBySerial } = params;
  const photoPath = row.photo?.path;

  if (row.target === "motor" || row.recordType === "engine") {
    const motorInput = buildMotorInputFromMigrationRow(row.values, companyId, photoPath);
    if (!motorInput) return { created: false, updated: false, motorAdded: false };

    const validated = upsertMotorSchema.parse({
      ...motorInput,
      companyId: normalizeCompanyId(motorInput.companyId),
    });
    const serialKey = validated.serialCode.trim().toLowerCase();
    const existing = serialKey ? motorsBySerial.get(serialKey) : undefined;
    const db = getAdminFirestore();

    if (existing && updateExisting) {
      const localId = existing.localId ?? Number(existing.id);
      await db
        .collection("users")
        .doc(uid)
        .collection("motors")
        .doc(String(localId))
        .set(
          {
            companyId: normalizeCompanyId(companyId),
            localId,
            serialCode: validated.serialCode,
            configuration: validated.configuration ?? "",
            notes: validated.notes ?? "",
            quantity: validated.quantity ?? 1,
            transmission: validated.transmission ?? "",
            brandName: validated.brandName ?? "Не указан",
            engineCode: validated.engineCode ?? "—",
            status: "available",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      return { created: false, updated: true, motorAdded: false };
    }

    const localId = existing && !updateExisting ? generateWebLocalId(existingMotors) : validated.localId ?? generateWebLocalId(existingMotors);
    await db
      .collection("users")
      .doc(uid)
      .collection("motors")
      .doc(String(localId))
      .set(
        {
          companyId: normalizeCompanyId(companyId),
          localId,
          serialCode: validated.serialCode,
          configuration: validated.configuration ?? "",
          notes: validated.notes ?? "",
          quantity: validated.quantity ?? 1,
          transmission: validated.transmission ?? "",
          brandName: validated.brandName ?? "Не указан",
          engineCode: validated.engineCode ?? "—",
          status: "available",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    if (serialKey) {
      const createdMotor: MotorEntity = {
        id: String(localId),
        companyId,
        localId,
        serialCode: validated.serialCode,
        configuration: validated.configuration ?? "",
        notes: validated.notes ?? "",
        quantity: validated.quantity ?? 1,
        transmission: "",
        arrivalDate: null,
      };
      existingMotors.push(createdMotor);
      motorsBySerial.set(serialKey, createdMotor);
    }

    return { created: true, updated: false, motorAdded: Boolean(serialKey) };
  }

  if (row.recordType === "donorCar") {
    return { created: false, updated: false, motorAdded: false };
  }

  if (isMigrationCatalogRecordType(row.recordType)) {
    const created = await persistMigrationSpecificRowAdmin({
      companyId,
      row,
      categoryCache: params.specificCategoryCache,
      categories: params.specificCategories,
    });
    return { created, updated: false, motorAdded: false };
  }

  const inventoryInput = buildInventoryInputFromMigrationRow(
    row.values,
    companyId,
    row.recordType,
    row.id,
    uid,
    photoPath,
  );
  if (!inventoryInput) return { created: false, updated: false, motorAdded: false };

  const skuKey = inventoryInput.sku.trim().toLowerCase();
  let itemId = skuCache.get(skuKey);

  if (!itemId) {
    const db = getAdminFirestore();
    const existing = await db
      .collection("inventoryItems")
      .where("companyId", "==", normalizeCompanyId(companyId))
      .where("sku", "==", inventoryInput.sku.trim())
      .limit(1)
      .get();

    if (existing.docs[0] && updateExisting) {
      itemId = existing.docs[0].id;
      await createInventoryItemAdmin(inventoryInput, itemId);
      skuCache.set(skuKey, itemId);
      await receiveStockAdmin({
        companyId,
        itemId,
        warehouseId,
        quantity: parseQuantity(row.values.quantity),
        unitCost: inventoryInput.purchasePrice,
        actorUserId: uid,
        idempotencyKey: `migration:${companyId}:${row.id}`,
      });
      return { created: false, updated: true, motorAdded: false };
    }

    if (existing.docs[0] && !updateExisting) {
      const altSku = `${inventoryInput.sku}-${row.id.replace(":", "-")}`.slice(0, 80);
      itemId = await createInventoryItemAdmin({ ...inventoryInput, sku: altSku });
      skuCache.set(altSku.trim().toLowerCase(), itemId);
    } else {
      itemId = await createInventoryItemAdmin(inventoryInput);
      skuCache.set(skuKey, itemId);
    }
  }

  await receiveStockAdmin({
    companyId,
    itemId,
    warehouseId,
    quantity: parseQuantity(row.values.quantity),
    unitCost: inventoryInput.purchasePrice,
    actorUserId: uid,
    idempotencyKey: `migration:${companyId}:${row.id}`,
  });

  return { created: true, updated: false, motorAdded: false };
}

export async function applyMigrationBatchAdmin(params: {
  uid: string;
  companyId: string;
  warehouseId: string;
  rows: ReviewRow[];
  duplicates: DuplicateGroup[];
  skuCache: Record<string, string>;
}): Promise<MigrationBatchResult> {
  const skuCache = new Map(Object.entries(params.skuCache));
  const counts = new Map<RecordType, number>();
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  let existingMotors: MotorEntity[] | null = null;
  let motorsBySerial = new Map<string, MotorEntity>();
  const { cache: specificCategoryCache, categories: specificCategories } =
    await createMigrationSpecificCategoryCache(params.companyId);

  for (const row of params.rows) {
    if (row.status !== "pending") continue;
    if (shouldSkipDuplicate(row, params.duplicates)) {
      skipped += 1;
      continue;
    }

    try {
      if ((row.target === "motor" || row.recordType === "engine") && !existingMotors) {
        existingMotors = await loadExistingMotorsAdmin(params.uid);
        motorsBySerial = motorIndexBySerial(existingMotors);
      }

      const result = await persistMigrationRowAdmin({
        uid: params.uid,
        companyId: params.companyId,
        warehouseId: params.warehouseId,
        row,
        skuCache,
        existingMotors: existingMotors ?? [],
        motorsBySerial,
        updateExisting: shouldUpdateDuplicate(row, params.duplicates),
        specificCategoryCache,
        specificCategories,
      });

      if (result.updated) updated += 1;
      else if (result.created) counts.set(row.recordType, (counts.get(row.recordType) ?? 0) + 1);
    } catch {
      errors += 1;
    }
  }

  const imported = [...counts.entries()]
    .filter(([type]) => type !== "unknown")
    .map(([type, count]) => ({ type, label: RECORD_TYPE_LABELS[type], count }))
    .sort((a, b) => b.count - a.count);

  return {
    imported,
    updated,
    skipped,
    errors,
    skuCache: Object.fromEntries(skuCache),
  };
}
