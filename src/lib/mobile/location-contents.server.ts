import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { buildLocationDisplayCode } from "@/domain/warehouse-location";
import { buildLocationEntityLink } from "@/lib/warehouse/location-entity-link";

export type LocationContentsItem = {
  kind: "part" | "motor" | "specific";
  id: string;
  title: string;
  subtitle?: string;
  quantity: number;
  available?: number;
  sku?: string;
  serialCode?: string;
};

export type LocationContentsResult = {
  location: {
    id: string;
    warehouseId: string;
    displayCode: string;
    code: string;
    label?: string;
    type: string;
    barcode: string;
    isSystem?: boolean;
  };
  occupancy: {
    lineCount: number;
    totalOnHand: number;
    totalAvailable: number;
    engineCount: number;
  };
  items: LocationContentsItem[];
};

function mapLocationDoc(id: string, data: Record<string, unknown>) {
  const path = Array.isArray(data.path) ? data.path.map((part) => String(part)) : [];
  const code = String(data.code ?? "");
  const displayCode =
    typeof data.displayCode === "string" && data.displayCode.trim()
      ? data.displayCode.trim()
      : buildLocationDisplayCode(path.length ? path : [code]);
  return {
    id,
    warehouseId: String(data.warehouseId ?? ""),
    displayCode,
    code,
    label: typeof data.label === "string" ? data.label : undefined,
    type: String(data.type ?? "custom"),
    barcode:
      typeof data.barcode === "string" && data.barcode.trim()
        ? data.barcode.trim()
        : buildLocationEntityLink(id),
    isSystem: Boolean(data.isSystem),
  };
}

export async function getMobileLocationContents(params: {
  companyId: string;
  locationId: string;
}): Promise<LocationContentsResult> {
  const companyId = normalizeCompanyId(params.companyId);
  const locationId = params.locationId.trim();
  if (!locationId) throw new Error("Provide a location");

  const db = getAdminFirestore();
  const locationSnap = await db.collection("warehouseLocations").doc(locationId).get();
  if (!locationSnap.exists) throw new Error("Location not found");
  const locationData = locationSnap.data() as Record<string, unknown>;
  if (normalizeCompanyId(String(locationData.companyId ?? "")) !== companyId) {
    throw new Error("Location not found");
  }

  const location = mapLocationDoc(locationSnap.id, locationData);
  const items: LocationContentsItem[] = [];

  const balanceSnap = await db
    .collection("inventoryLocationBalances")
    .where("companyId", "==", companyId)
    .where("locationId", "==", locationId)
    .limit(500)
    .get();

  const itemIds = balanceSnap.docs
    .map((doc) => String(doc.data().itemId ?? ""))
    .filter(Boolean);
  const itemSnaps = await Promise.all(
    itemIds.map((itemId) => db.collection("inventoryItems").doc(itemId).get()),
  );
  const itemById = new Map(
    itemSnaps.filter((snap) => snap.exists).map((snap) => [snap.id, snap.data() as Record<string, unknown>]),
  );

  let totalOnHand = 0;
  let totalAvailable = 0;
  for (const doc of balanceSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const onHand = Number(data.onHand ?? 0);
    const available = Number(data.available ?? onHand);
    if (onHand <= 0 && available <= 0) continue;
    totalOnHand += onHand;
    totalAvailable += available;
    const itemId = String(data.itemId ?? "");
    const item = itemById.get(itemId);
    items.push({
      kind: "part",
      id: itemId,
      title: String(item?.name ?? itemId),
      subtitle: typeof item?.sku === "string" ? item.sku : undefined,
      sku: typeof item?.sku === "string" ? item.sku : undefined,
      quantity: onHand,
      available,
    });
  }

  let engineCount = 0;
  try {
    const motorSnap = await db
      .collectionGroup("motors")
      .where("companyId", "==", companyId)
      .where("primaryLocationId", "==", locationId)
      .limit(200)
      .get();

    for (const doc of motorSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (data.deletedAt) continue;
      if (data.soldDate) continue;
      engineCount += 1;
      const brand = typeof data.brandName === "string" ? data.brandName : "";
      const engine = typeof data.engineCode === "string" ? data.engineCode : "";
      const serial = String(data.serialCode ?? doc.id);
      items.push({
        kind: "motor",
        id: String(data.localId ?? doc.id),
        title: [brand, engine].filter(Boolean).join(" ") || serial,
        subtitle: serial,
        serialCode: serial,
        quantity: Number(data.quantity ?? 1) || 1,
      });
    }
  } catch (error) {
    console.warn("[location-contents] motors query skipped", error);
  }

  try {
    const specificSnap = await db
      .collection("specificRecords")
      .where("companyId", "==", companyId)
      .where("primaryLocationId", "==", locationId)
      .limit(200)
      .get();

    for (const doc of specificSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const rowData =
        data.data && typeof data.data === "object" && !Array.isArray(data.data)
          ? (data.data as Record<string, string>)
          : {};
      const title =
        rowData["Номер двигателя"] ||
        rowData.serialCode ||
        rowData.warehouseLocation ||
        doc.id;
      items.push({
        kind: "specific",
        id: doc.id,
        title,
        subtitle: rowData["Комплектация"] || rowData.configuration,
        quantity: Number(rowData["Кол-во"] || rowData.quantity || 1) || 1,
      });
    }
  } catch (error) {
    console.warn("[location-contents] specific query skipped", error);
  }

  return {
    location,
    occupancy: {
      lineCount: items.length,
      totalOnHand,
      totalAvailable,
      engineCount,
    },
    items,
  };
}
