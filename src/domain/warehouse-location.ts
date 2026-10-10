/**
 * Hierarchical warehouse locations (zones → racks → shelves → bins, or custom leaves).
 * Qty balances will live on locations in a later milestone; this domain is the tree first.
 */

export const WAREHOUSE_LOCATION_TYPES = [
  "zone",
  "row",
  "rack",
  "shelf",
  "bin",
  "custom",
] as const;

export type WarehouseLocationType = (typeof WAREHOUSE_LOCATION_TYPES)[number];

/** System leaf for stock without an assigned place (per warehouse). */
export const UNLOCATED_LOCATION_CODE = "UNLOCATED";
export const UNLOCATED_LOCATION_LABEL = "Unlocated";

export type LocationLabelScheme = {
  separator: string;
  /** Ordered segment types used when building structured display codes. */
  segmentTypes: WarehouseLocationType[];
};

export const DEFAULT_LOCATION_LABEL_SCHEME: LocationLabelScheme = {
  separator: "-",
  segmentTypes: ["zone", "rack", "shelf", "bin"],
};

export type WarehouseLocation = {
  id: string;
  companyId: string;
  warehouseId: string;
  parentId?: string | null;
  type: WarehouseLocationType;
  /** Segment or free-form code (e.g. "A", "03", "Engine Yard"). */
  code: string;
  /** Ancestor codes from root to this node (inclusive). */
  path: string[];
  /** Denormalized path join for UI/search/print. */
  displayCode: string;
  label?: string;
  barcode?: string;
  tags?: string[];
  isSystem?: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdByUserId?: string;
  updatedByUserId?: string;
};

export type CreateWarehouseLocationInput = {
  companyId: string;
  warehouseId: string;
  parentId?: string | null;
  type: WarehouseLocationType;
  code: string;
  label?: string;
  barcode?: string;
  tags?: string[];
  sortOrder?: number;
  actorUserId?: string;
  /** When set, skips path derivation from parent (system seeds). */
  path?: string[];
  displayCode?: string;
  isSystem?: boolean;
  /** Fixed document id; omit for a random one. */
  id?: string;
};

export type UpdateWarehouseLocationInput = {
  code?: string;
  label?: string | null;
  barcode?: string | null;
  tags?: string[] | null;
  isActive?: boolean;
  sortOrder?: number;
  actorUserId?: string;
};

export function buildLocationDisplayCode(
  path: string[],
  separator = DEFAULT_LOCATION_LABEL_SCHEME.separator,
): string {
  return path.map((part) => part.trim()).filter(Boolean).join(separator);
}

export function normalizeLocationCode(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function unlocatedLocationDocId(warehouseId: string): string {
  return `unlocated_${warehouseId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/**
 * One document per (warehouse, path). Lookup-then-create raced when several grid rows
 * saved at once, leaving five identical "WAREHOUSE" locations; a fixed id makes the
 * concurrent creates land on the same document instead.
 */
export function locationLeafDocId(warehouseId: string, displayCode: string): string {
  return `loc_${warehouseId.replace(/[^a-zA-Z0-9_-]/g, "_")}_${encodeURIComponent(displayCode.trim())}`;
}

export function isUnlocatedLocation(location: Pick<WarehouseLocation, "code" | "isSystem">): boolean {
  return location.isSystem === true || location.code === UNLOCATED_LOCATION_CODE;
}
