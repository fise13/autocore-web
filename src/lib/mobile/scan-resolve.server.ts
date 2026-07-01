import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { normalizeBarcode } from "@/lib/warehouse/warehouse-sync-ids";

export type MobileScanStockLevel = {
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
};

export type MobileScanItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  warehouseLocation?: string;
  sellPrice?: number;
  purchasePrice?: number;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  lowStockThreshold?: number;
};

export type MobileScanResolveResult = {
  found: boolean;
  barcode: string;
  matchType: "barcode_mapping" | "sku" | null;
  item: MobileScanItem | null;
  stockLevels: MobileScanStockLevel[];
};

function mapItem(id: string, data: Record<string, unknown>): MobileScanItem {
  const totalOnHand = Number(data.totalOnHand ?? data.quantity ?? 0);
  const totalReserved = Number(data.totalReserved ?? 0);
  return {
    id,
    sku: String(data.sku ?? ""),
    name: String(data.name ?? ""),
    unit: typeof data.unit === "string" ? data.unit : "шт",
    warehouseLocation:
      typeof data.warehouseLocation === "string" ? data.warehouseLocation : undefined,
    sellPrice: data.sellPrice == null ? undefined : Number(data.sellPrice),
    purchasePrice: data.purchasePrice == null ? undefined : Number(data.purchasePrice),
    totalOnHand,
    totalReserved,
    totalAvailable: Number(data.totalAvailable ?? totalOnHand - totalReserved),
    lowStockThreshold:
      data.lowStockThreshold == null ? undefined : Number(data.lowStockThreshold),
  };
}

async function loadWarehouseNames(
  companyId: string,
  warehouseIds: string[],
): Promise<Map<string, string>> {
  const db = getAdminFirestore();
  const names = new Map<string, string>();
  await Promise.all(
    warehouseIds.map(async (warehouseId) => {
      const snap = await db.collection("warehouses").doc(warehouseId).get();
      names.set(
        warehouseId,
        snap.exists ? String(snap.data()?.name ?? warehouseId) : warehouseId,
      );
    }),
  );
  return names;
}

export async function resolveMobileScan(
  companyId: string,
  rawBarcode: string,
): Promise<MobileScanResolveResult> {
  const barcode = normalizeBarcode(rawBarcode);
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const empty: MobileScanResolveResult = {
    found: false,
    barcode,
    matchType: null,
    item: null,
    stockLevels: [],
  };

  if (!barcode) return empty;

  const db = getAdminFirestore();

  const mappingSnap = await db
    .collection("barcodeMappings")
    .where("companyId", "==", normalizedCompanyId)
    .where("barcode", "==", barcode)
    .limit(1)
    .get();

  let itemId: string | null = null;
  let matchType: MobileScanResolveResult["matchType"] = null;

  if (!mappingSnap.empty) {
    itemId = String(mappingSnap.docs[0]!.data().itemId ?? "");
    matchType = "barcode_mapping";
  } else {
    const skuSnap = await db
      .collection("inventoryItems")
      .where("companyId", "==", normalizedCompanyId)
      .where("sku", "==", barcode)
      .limit(1)
      .get();
    if (!skuSnap.empty) {
      itemId = skuSnap.docs[0]!.id;
      matchType = "sku";
    }
  }

  if (!itemId) return empty;

  const itemSnap = await db.collection("inventoryItems").doc(itemId).get();
  if (!itemSnap.exists) return empty;

  const item = mapItem(itemSnap.id, itemSnap.data() as Record<string, unknown>);

  const stockSnap = await db
    .collection("inventoryStockLevels")
    .where("companyId", "==", normalizedCompanyId)
    .where("itemId", "==", itemId)
    .limit(20)
    .get();

  const warehouseIds = stockSnap.docs.map((doc) => String(doc.data().warehouseId ?? ""));
  const warehouseNames = await loadWarehouseNames(normalizedCompanyId, warehouseIds);

  const stockLevels = stockSnap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const warehouseId = String(data.warehouseId ?? "");
    const onHand = Number(data.onHand ?? 0);
    const reserved = Number(data.reserved ?? 0);
    return {
      warehouseId,
      warehouseName: warehouseNames.get(warehouseId) ?? warehouseId,
      onHand,
      reserved,
      available: Number(data.available ?? onHand - reserved),
    };
  });

  stockLevels.sort((a, b) => b.onHand - a.onHand);

  return {
    found: true,
    barcode,
    matchType,
    item,
    stockLevels,
  };
}
