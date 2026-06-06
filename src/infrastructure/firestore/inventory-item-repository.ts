import {
  Timestamp,
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { InventoryItem, UpsertInventoryItemInput } from "@/domain/inventory";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { createBarcodeMappingRepository } from "@/infrastructure/firestore/barcode-mapping-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";
import {
  buildInventorySearchTokens,
  normalizeBarcode,
  normalizeBrandName,
  normalizeSupplierName,
  normalizeWarehouseLocation,
} from "@/lib/warehouse/warehouse-search";

const COLLECTION = "inventoryItems";

function mapItem(id: string, data: Record<string, unknown>): InventoryItem {
  const averageCost = Number(data.averageCost ?? data.purchasePrice ?? 0);
  const totalOnHand = Number(data.totalOnHand ?? data.quantity ?? 0);
  return {
    id,
    companyId: String(data.companyId ?? ""),
    localId: data.localId == null ? undefined : Number(data.localId),
    type: (data.type as InventoryItem["type"]) ?? "generic",
    sku: String(data.sku ?? ""),
    name: String(data.name ?? ""),
    description: typeof data.description === "string" ? data.description : undefined,
    barcodes: Array.isArray(data.barcodes) ? data.barcodes.map(String) : [],
    brandId: typeof data.brandId === "string" ? data.brandId : undefined,
    brandName: typeof data.brandName === "string" ? data.brandName : undefined,
    supplierName: typeof data.supplierName === "string" ? data.supplierName : undefined,
    warehouseLocation:
      typeof data.warehouseLocation === "string" ? data.warehouseLocation : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    categoryId: typeof data.categoryId === "string" ? data.categoryId : undefined,
    categoryPath: Array.isArray(data.categoryPath) ? data.categoryPath.map(String) : undefined,
    unit: typeof data.unit === "string" ? data.unit : "шт",
    purchasePrice: data.purchasePrice == null ? undefined : Number(data.purchasePrice),
    averageCost: Number.isFinite(averageCost) ? averageCost : undefined,
    sellPrice: data.sellPrice == null ? undefined : Number(data.sellPrice),
    currency: typeof data.currency === "string" ? data.currency : "KZT",
    totalOnHand,
    totalReserved: Number(data.totalReserved ?? 0),
    totalAvailable: Number(data.totalAvailable ?? totalOnHand),
    stockValue: Number(data.stockValue ?? totalOnHand * averageCost),
    status: (data.status as InventoryItem["status"]) ?? "active",
    lowStockThreshold:
      data.lowStockThreshold == null ? undefined : Number(data.lowStockThreshold),
    reorderPoint: data.reorderPoint == null ? undefined : Number(data.reorderPoint),
    imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls.map(String) : undefined,
    documentIds: Array.isArray(data.documentIds) ? data.documentIds.map(String) : undefined,
    searchTokens: Array.isArray(data.searchTokens) ? data.searchTokens.map(String) : [],
    createdAt: toDateFromFirestore(data.createdAt) ?? undefined,
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
    createdByUserId:
      typeof data.createdByUserId === "string" ? data.createdByUserId : undefined,
    updatedByUserId:
      typeof data.updatedByUserId === "string" ? data.updatedByUserId : undefined,
  };
}

function optionalNumberField(value: number | undefined, clearOnUpdate: boolean) {
  if (value != null) return value;
  return clearOnUpdate ? deleteField() : undefined;
}

function optionalTextField(value: string | undefined, clearOnUpdate: boolean) {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  return clearOnUpdate ? deleteField() : undefined;
}

function optionalStringArrayField(value: string[] | undefined, clearOnUpdate: boolean) {
  if (value?.length) return value;
  return clearOnUpdate ? deleteField() : undefined;
}

function omitUndefinedFields(payload: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

function buildItemPayload(input: UpsertInventoryItemInput, options?: { isUpdate?: boolean }) {
  const clearOnUpdate = options?.isUpdate ?? false;
  const brandName = normalizeBrandName(input.brandName);
  const supplierName = normalizeSupplierName(input.supplierName);
  const warehouseLocation = normalizeWarehouseLocation(input.warehouseLocation);
  const barcodes = (input.barcodes ?? []).map((code) => normalizeBarcode(code)).filter(Boolean);
  const payload: Record<string, unknown> = {
    companyId: normalizeCompanyId(input.companyId),
    type: input.type ?? "consumable",
    sku: input.sku.trim(),
    name: input.name.trim(),
    barcodes,
    unit: input.unit?.trim() || "шт",
    currency: input.currency ?? "KZT",
    status: input.status ?? "active",
    searchTokens: buildInventorySearchTokens({ ...input, barcodes, brandName, supplierName, warehouseLocation }),
    updatedAt: serverTimestamp(),
  };

  if (input.localId != null) payload.localId = input.localId;
  if (input.actorUserId) payload.updatedByUserId = input.actorUserId;
  if (input.imageUrls) payload.imageUrls = input.imageUrls;
  if (input.documentIds) payload.documentIds = input.documentIds;

  const description = optionalTextField(input.description, clearOnUpdate);
  const brandId = optionalTextField(input.brandId, clearOnUpdate);
  const categoryId = optionalTextField(input.categoryId, clearOnUpdate);
  const notes = optionalTextField(input.notes, clearOnUpdate);
  const categoryPath = optionalStringArrayField(input.categoryPath, clearOnUpdate);

  if (description !== undefined) payload.description = description;
  if (brandId !== undefined) payload.brandId = brandId;
  if (brandName) payload.brandName = brandName;
  else if (clearOnUpdate) payload.brandName = deleteField();
  if (supplierName) payload.supplierName = supplierName;
  else if (clearOnUpdate) payload.supplierName = deleteField();
  if (warehouseLocation) payload.warehouseLocation = warehouseLocation;
  else if (clearOnUpdate) payload.warehouseLocation = deleteField();
  if (notes !== undefined) payload.notes = notes;
  if (categoryId !== undefined) payload.categoryId = categoryId;
  if (categoryPath !== undefined) payload.categoryPath = categoryPath;

  const purchasePrice = optionalNumberField(input.purchasePrice, clearOnUpdate);
  const sellPrice = optionalNumberField(input.sellPrice, clearOnUpdate);
  const lowStockThreshold = optionalNumberField(input.lowStockThreshold, clearOnUpdate);
  const reorderPoint = optionalNumberField(input.reorderPoint, clearOnUpdate);
  const averageCost = optionalNumberField(input.averageCost ?? input.purchasePrice, clearOnUpdate);

  if (purchasePrice !== undefined) payload.purchasePrice = purchasePrice;
  if (sellPrice !== undefined) payload.sellPrice = sellPrice;
  if (lowStockThreshold !== undefined) payload.lowStockThreshold = lowStockThreshold;
  if (reorderPoint !== undefined) payload.reorderPoint = reorderPoint;
  if (averageCost !== undefined) payload.averageCost = averageCost;

  return omitUndefinedFields(payload);
}

export type InventoryItemRepository = ReturnType<typeof createInventoryItemRepository>;

export function createInventoryItemRepository() {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();
  const barcodeMappings = createBarcodeMappingRepository();
  const ref = collection(db, COLLECTION);

  async function upsertBarcodeMappings(input: UpsertInventoryItemInput, itemId: string) {
    const barcodes = (input.barcodes ?? []).map((code) => normalizeBarcode(code)).filter(Boolean);
    await Promise.all(
      barcodes.map((barcode, index) =>
        barcodeMappings.upsert({
          companyId: input.companyId,
          barcode,
          itemId,
          isPrimary: index === 0,
        }),
      ),
    );
  }

  return {
    subscribe(
      companyId: string,
      onData: (items: InventoryItem[]) => void,
      onError?: (error: Error) => void,
    ) {
      const normalized = normalizeCompanyId(companyId);
      const q = query(
        ref,
        where("companyId", "==", normalized),
        orderBy("updatedAt", "desc"),
        limit(500),
      );
      return onSnapshot(
        q,
        (snapshot) => {
          onData(
            snapshot.docs
              .map((item) => mapItem(item.id, item.data() as Record<string, unknown>))
              .filter((item) => item.status === "active" || item.status === "discontinued"),
          );
        },
        (error) => {
          notifyFirestoreSnapshotError(error);
          onError?.(error);
        },
      );
    },

    async getById(itemId: string): Promise<InventoryItem | null> {
      const snapshot = await getDoc(doc(db, COLLECTION, itemId));
      if (!snapshot.exists()) return null;
      return mapItem(snapshot.id, snapshot.data() as Record<string, unknown>);
    },

    async findBySku(companyId: string, sku: string): Promise<InventoryItem | null> {
      const normalized = normalizeCompanyId(companyId);
      const snapshot = await getDocs(
        query(ref, where("companyId", "==", normalized), where("sku", "==", sku.trim()), limit(1)),
      );
      const first = snapshot.docs[0];
      if (!first) return null;
      return mapItem(first.id, first.data() as Record<string, unknown>);
    },

    async findBySkus(companyId: string, skus: string[]): Promise<Map<string, InventoryItem>> {
      const result = new Map<string, InventoryItem>();
      const normalizedCompanyId = normalizeCompanyId(companyId);
      const unique = [...new Set(skus.map((sku) => sku.trim()).filter(Boolean))];
      if (unique.length === 0) return result;

      for (let offset = 0; offset < unique.length; offset += 30) {
        const chunk = unique.slice(offset, offset + 30);
        const snapshot = await getDocs(
          query(
            ref,
            where("companyId", "==", normalizedCompanyId),
            where("sku", "in", chunk),
          ),
        );
        for (const item of snapshot.docs) {
          const mapped = mapItem(item.id, item.data() as Record<string, unknown>);
          result.set(mapped.sku.trim().toLowerCase(), mapped);
        }
      }

      return result;
    },

    async upsert(input: UpsertInventoryItemInput, itemId?: string): Promise<string> {
      const normalizedCompanyId = normalizeCompanyId(input.companyId);

      if (itemId) {
        const payload = buildItemPayload(input, { isUpdate: true });
        await updateDoc(doc(db, COLLECTION, itemId), payload);
        await upsertBarcodeMappings(input, itemId);
        if (input.actorUserId) {
          try {
            await activity.append(normalizedCompanyId, {
              actor: input.actorUserId,
              action: "inventory.item_upserted",
              target: `inventoryItem:${itemId}`,
              targetId: itemId,
              targetName: input.name,
            });
          } catch {
            // Activity log is best-effort; inventory write already succeeded.
          }
        }
        return itemId;
      }

      const payload = buildItemPayload(input);
      const created = await addDoc(ref, {
        ...payload,
        totalOnHand: 0,
        totalReserved: 0,
        totalAvailable: 0,
        stockValue: 0,
        createdAt: serverTimestamp(),
        createdByUserId: input.actorUserId,
      });
      await upsertBarcodeMappings(input, created.id);
      if (input.actorUserId) {
        try {
          await activity.append(normalizedCompanyId, {
            actor: input.actorUserId,
            action: "inventory.item_created",
            target: `inventoryItem:${created.id}`,
            targetId: created.id,
            targetName: input.name,
          });
        } catch {
          // Activity log is best-effort; inventory write already succeeded.
        }
      }
      return created.id;
    },

    async updateAggregates(
      itemId: string,
      aggregates: {
        totalOnHand: number;
        totalReserved: number;
        totalAvailable: number;
        stockValue: number;
        averageCost?: number;
        purchasePrice?: number;
      },
    ): Promise<void> {
      await updateDoc(doc(db, COLLECTION, itemId), {
        ...aggregates,
        updatedAt: serverTimestamp(),
      });
    },

    async archive(itemId: string, companyId: string, actorUserId: string): Promise<void> {
      await updateDoc(doc(db, COLLECTION, itemId), {
        status: "archived",
        updatedAt: serverTimestamp(),
        updatedByUserId: actorUserId,
      });
      try {
        await activity.append(normalizeCompanyId(companyId), {
          actor: actorUserId,
          action: "inventory.item_archived",
          target: `inventoryItem:${itemId}`,
          targetId: itemId,
        });
      } catch {
        // Activity log is best-effort; archive write already succeeded.
      }
    },

    mapItem,
  };
}

export const createInventoryRepository = createInventoryItemRepository;
