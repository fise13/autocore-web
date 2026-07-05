import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import type { UpsertInventoryItemInput } from "@/domain/inventory";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { normalizeInventoryTaxonomyInput } from "@/lib/warehouse/inventory-taxonomy-normalize";
import { buildInventorySearchTokens } from "@/lib/warehouse/warehouse-search";
import { normalizeBarcode } from "@/lib/warehouse/warehouse-sync-ids";

import { quickReceiveMobileStock } from "./quick-receive.server";

const mobileCreateInventoryItemSchema = z.object({
  barcode: z.string().trim().min(1),
  sku: z.string().trim().optional(),
  name: z.string().trim().min(1),
  brandName: z.string().trim().optional(),
  warehouseLocation: z.string().trim().optional(),
  unit: z.string().trim().default("шт"),
  sellPrice: z.number().nonnegative().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  initialQuantity: z.number().int().nonnegative().optional(),
});

export type MobileCreateInventoryItemInput = {
  companyId: string;
  actorUserId: string;
  barcode: string;
  sku?: string;
  name: string;
  brandName?: string;
  warehouseLocation?: string;
  unit?: string;
  sellPrice?: number;
  purchasePrice?: number;
  initialQuantity?: number;
};

export type MobileCreateInventoryItemResult = {
  itemId: string;
  sku: string;
  name: string;
  barcode: string;
};

async function assertBarcodeAvailable(companyId: string, barcode: string): Promise<void> {
  const db = getAdminFirestore();
  const normalized = normalizeBarcode(barcode);
  const snap = await db
    .collection("barcodeMappings")
    .where("companyId", "==", normalizeCompanyId(companyId))
    .where("barcode", "==", normalized)
    .limit(1)
    .get();

  if (!snap.empty) {
    throw new Error("Этот штрихкод уже привязан к другой позиции");
  }
}

async function assertSkuAvailable(companyId: string, sku: string): Promise<void> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("inventoryItems")
    .where("companyId", "==", normalizeCompanyId(companyId))
    .where("sku", "==", sku.trim())
    .limit(1)
    .get();

  if (!snap.empty) {
    throw new Error(`Артикул «${sku.trim()}» уже существует`);
  }
}

export async function createMobileInventoryItem(
  input: MobileCreateInventoryItemInput,
): Promise<MobileCreateInventoryItemResult> {
  const parsed = mobileCreateInventoryItemSchema.parse({
    barcode: input.barcode,
    sku: input.sku,
    name: input.name,
    brandName: input.brandName,
    warehouseLocation: input.warehouseLocation,
    unit: input.unit,
    sellPrice: input.sellPrice,
    purchasePrice: input.purchasePrice,
    initialQuantity: input.initialQuantity,
  });

  const companyId = normalizeCompanyId(input.companyId);
  const barcode = normalizeBarcode(parsed.barcode);
  const sku = (parsed.sku?.trim() || barcode).trim();

  await assertBarcodeAvailable(companyId, barcode);
  await assertSkuAvailable(companyId, sku);

  const upsertInput: UpsertInventoryItemInput = {
    companyId,
    type: "generic",
    sku,
    name: parsed.name,
    barcodes: [barcode],
    brandName: parsed.brandName,
    warehouseLocation: parsed.warehouseLocation,
    unit: parsed.unit,
    sellPrice: parsed.sellPrice,
    purchasePrice: parsed.purchasePrice,
    currency: "KZT",
    status: "active",
    actorUserId: input.actorUserId,
  };

  const normalized = normalizeInventoryTaxonomyInput(upsertInput);
  const searchTokens = buildInventorySearchTokens(normalized);

  const db = getAdminFirestore();
  const payload: Record<string, unknown> = {
    companyId,
    type: "generic",
    sku,
    name: parsed.name.trim(),
    barcodes: [barcode],
    unit: parsed.unit,
    currency: "KZT",
    status: "active",
    inventoryGroup: normalized.inventoryGroup ?? "consumables",
    searchTokens,
    totalOnHand: 0,
    totalReserved: 0,
    totalAvailable: 0,
    stockValue: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdByUserId: input.actorUserId,
    updatedByUserId: input.actorUserId,
  };

  if (parsed.brandName) payload.brandName = parsed.brandName.trim();
  if (parsed.warehouseLocation) payload.warehouseLocation = parsed.warehouseLocation.trim();
  if (parsed.purchasePrice != null) {
    payload.purchasePrice = parsed.purchasePrice;
    payload.averageCost = parsed.purchasePrice;
  }
  if (parsed.sellPrice != null) payload.sellPrice = parsed.sellPrice;
  if (normalized.subcategoryId) payload.subcategoryId = normalized.subcategoryId;

  const created = await db.collection("inventoryItems").add(payload);
  const itemId = created.id;

  await db.collection("barcodeMappings").add({
    companyId,
    barcode,
    itemId,
    isPrimary: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const initialQuantity = parsed.initialQuantity ?? 0;
  if (initialQuantity > 0) {
    await quickReceiveMobileStock({
      companyId,
      itemId,
      quantity: initialQuantity,
      unitCost: parsed.purchasePrice,
      actorUserId: input.actorUserId,
      idempotencyKey: `mobile:create-item:${itemId}:${input.actorUserId}`,
    });
  }

  return {
    itemId,
    sku,
    name: parsed.name.trim(),
    barcode,
  };
}
