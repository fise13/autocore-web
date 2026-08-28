import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { InventorySubcategoryId } from "@/domain/inventory-taxonomy";
import {
  presetForSubcategory,
  resolveGroupForCategoryName,
  resolveSubcategoryForCategoryName,
  subcategoryLabel,
} from "@/domain/inventory-taxonomy";
import type { SpecificCategoryEntity } from "@/domain/specific-category";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { createDefaultColumnSchema, normalizeColumnSchema } from "@/lib/specific/specific-category-schema";
import {
  scopedCategoryDocumentId,
  scopedRecordDocumentId,
} from "@/lib/specific/specific-sync-ids";

import {
  buildSpecificRecordDataFromMigrationRow,
  migrationCategoryNameForRecordType,
  migrationSubcategoryForRecordType,
} from "./migration-row-builders";
import type { CanonicalField, RecordType } from "./types";
import type { ReviewRow } from "@/components/migration/migration-types";
import { SPECIFIC_LOCATION_COLUMN_KEY } from "@/lib/specific/specific-location-column";

export type SpecificCategoryCache = Map<InventorySubcategoryId, SpecificCategoryEntity>;

function nextLocalId(existing: Array<{ localId: number }>): number {
  const max = existing.reduce((acc, item) => Math.max(acc, item.localId ?? 0), 0);
  return max + 1;
}

function migrationRowIndex(rowId: string): number {
  const [tablePart, rowPart] = rowId.split(":");
  const table = Number(tablePart);
  const row = Number(rowPart);
  if (Number.isFinite(table) && Number.isFinite(row)) {
    return table * 100_000 + row;
  }
  return Math.abs(
    rowId.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0),
  ) % 2_000_000;
}

async function loadSpecificCategoriesAdmin(companyId: string): Promise<SpecificCategoryEntity[]> {
  const db = getAdminFirestore();
  const normalized = normalizeCompanyId(companyId);
  const snapshot = await db
    .collection("specificCategories")
    .where("companyId", "==", normalized)
    .get();

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const localId = Number(data.localId ?? 0);
    const name = String(data.name ?? "");
    const resolvedSubcategory = resolveSubcategoryForCategoryName(name);
    return {
      id: docSnap.id,
      localId,
      name,
      companyId: normalized,
      groupId:
        (data.groupId as SpecificCategoryEntity["groupId"]) ??
        resolvedSubcategory?.groupId ??
        resolveGroupForCategoryName(name),
      subcategoryId:
        (data.subcategoryId as InventorySubcategoryId | undefined) ?? resolvedSubcategory?.id,
      columnSchema: Array.isArray(data.columnSchema)
        ? normalizeColumnSchema(data.columnSchema as SpecificCategoryEntity["columnSchema"])
        : [],
    };
  });
}

async function ensureSpecificCategoryAdmin(
  companyId: string,
  subcategoryId: InventorySubcategoryId,
  existing: SpecificCategoryEntity[],
): Promise<SpecificCategoryEntity> {
  const preset = presetForSubcategory(subcategoryId);
  const match = existing.find((category) => category.subcategoryId === subcategoryId);
  if (match) return match;

  const name = preset?.label ?? subcategoryLabel(subcategoryId);
  const normalized = normalizeCompanyId(companyId);
  const localId = nextLocalId(existing);
  const docId = scopedCategoryDocumentId(normalized, localId);
  const columnSchema = normalizeColumnSchema(createDefaultColumnSchema());

  const db = getAdminFirestore();
  await db.collection("specificCategories").doc(docId).set({
    companyId: normalized,
    localId,
    name,
    groupId: preset?.groupId ?? resolveGroupForCategoryName(name),
    subcategoryId,
    columnSchema,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const created: SpecificCategoryEntity = {
    id: docId,
    localId,
    name,
    companyId: normalized,
    groupId: preset?.groupId ?? resolveGroupForCategoryName(name),
    subcategoryId,
    columnSchema,
  };
  existing.push(created);
  return created;
}

export async function createMigrationSpecificCategoryCache(
  companyId: string,
): Promise<{ cache: SpecificCategoryCache; categories: SpecificCategoryEntity[] }> {
  const categories = await loadSpecificCategoriesAdmin(companyId);
  const cache: SpecificCategoryCache = new Map();
  for (const category of categories) {
    if (category.subcategoryId) {
      cache.set(category.subcategoryId, category);
    }
  }
  return { cache, categories };
}

export async function persistMigrationSpecificRowAdmin(params: {
  companyId: string;
  row: ReviewRow;
  categoryCache: SpecificCategoryCache;
  categories: SpecificCategoryEntity[];
}): Promise<boolean> {
  const subcategoryId = migrationSubcategoryForRecordType(params.row.recordType);
  if (!subcategoryId) return false;

  const data = buildSpecificRecordDataFromMigrationRow(
    params.row.values,
    params.row.recordType,
    params.row.photo?.path,
  );
  if (!data) return false;

  let category = params.categoryCache.get(subcategoryId);
  if (!category) {
    category = await ensureSpecificCategoryAdmin(
      params.companyId,
      subcategoryId,
      params.categories,
    );
    params.categoryCache.set(subcategoryId, category);
  }

  const normalized = normalizeCompanyId(params.companyId);
  const rowIndex = migrationRowIndex(params.row.id);
  const recordRef = getAdminFirestore()
    .collection("specificRecords")
    .doc(scopedRecordDocumentId(normalized, category.localId, rowIndex));

  await recordRef.set(
    {
      companyId: normalized,
      categoryId: scopedCategoryDocumentId(normalized, category.localId),
      categoryLocalId: category.localId,
      rowIndex,
      data,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return true;
}

function identityRowIndex(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash % 1_000_000_000) + 1;
}

export async function persistBusinessImportSpecificAdmin(params: {
  companyId: string;
  recordType: RecordType;
  values: Partial<Record<CanonicalField, string>>;
  entityId: string;
  existingId?: string;
  location?: {
    warehouseLocation: string;
    primaryLocationId: string;
    primaryLocationCode: string;
  };
  categoryCache: SpecificCategoryCache;
  categories: SpecificCategoryEntity[];
}): Promise<string | null> {
  const subcategoryId = migrationSubcategoryForRecordType(params.recordType);
  if (!subcategoryId) return null;

  const data = buildSpecificRecordDataFromMigrationRow(params.values, params.recordType);
  if (!data) return null;
  if (params.location) {
    data[SPECIFIC_LOCATION_COLUMN_KEY] = params.location.warehouseLocation;
    data["Место"] = params.location.warehouseLocation;
  }

  let category = params.categoryCache.get(subcategoryId);
  if (!category) {
    category = await ensureSpecificCategoryAdmin(
      params.companyId,
      subcategoryId,
      params.categories,
    );
    params.categoryCache.set(subcategoryId, category);
  }

  const normalized = normalizeCompanyId(params.companyId);
  const identity =
    params.values.serial?.trim() || params.values.sku?.trim() || params.entityId;
  const rowIndex = identityRowIndex(`${params.recordType}:${identity}`);
  const recordRef = getAdminFirestore()
    .collection("specificRecords")
    .doc(
      params.existingId?.trim() ||
        scopedRecordDocumentId(normalized, category.localId, rowIndex),
    );

  const payload: Record<string, unknown> = {
    companyId: normalized,
    categoryId: scopedCategoryDocumentId(normalized, category.localId),
    categoryLocalId: category.localId,
    data,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!params.existingId?.trim()) {
    payload.rowIndex = rowIndex;
    payload.createdAt = FieldValue.serverTimestamp();
  }
  if (params.location) {
    payload.warehouseLocation = params.location.warehouseLocation;
    payload.primaryLocationId = params.location.primaryLocationId;
    payload.primaryLocationCode = params.location.primaryLocationCode;
  }

  await recordRef.set(payload, { merge: true });
  return recordRef.id;
}

export function migrationUsesSpecificCatalog(recordType: RecordType): boolean {
  return Boolean(migrationSubcategoryForRecordType(recordType));
}

export function migrationSpecificCategoryLabel(recordType: RecordType): string {
  return migrationCategoryNameForRecordType(recordType);
}
