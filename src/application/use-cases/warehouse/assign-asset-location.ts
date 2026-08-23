import { createWarehouseLocationRepository } from "@/infrastructure/firestore/warehouse-location-repository";
import { createWarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { normalizeCompanyId } from "@/lib/company-id";
import { normalizeWarehouseLocation } from "@/lib/warehouse/warehouse-search";

export type AssignedAssetLocation = {
  warehouseId: string;
  primaryLocationId: string;
  primaryLocationCode: string;
  warehouseLocation: string;
};

/**
 * Resolve free-text cell → warehouseLocations leaf for unit assets
 * (motors, specific records). No inventoryLocationBalances.
 */
export async function assignAssetLocation(params: {
  companyId: string;
  locationText: string | undefined | null;
  warehouseId?: string | null;
  actorUserId?: string;
}): Promise<AssignedAssetLocation | null> {
  const next = normalizeWarehouseLocation(params.locationText ?? "");
  if (!next) return null;

  const companyId = normalizeCompanyId(params.companyId);
  const warehouseRepo = createWarehouseRepository();
  const locationRepo = createWarehouseLocationRepository();

  const warehouseId =
    params.warehouseId?.trim() ||
    (await warehouseRepo.getDefault(companyId))?.id ||
    null;
  if (!warehouseId) {
    throw new Error("Warehouse not found — create a warehouse before assigning a location");
  }

  const leaf = await locationRepo.ensureCustomLeaf(
    companyId,
    warehouseId,
    next,
    params.actorUserId,
  );

  return {
    warehouseId,
    primaryLocationId: leaf.id,
    primaryLocationCode: leaf.displayCode,
    warehouseLocation: normalizeWarehouseLocation(leaf.displayCode) || leaf.displayCode,
  };
}
