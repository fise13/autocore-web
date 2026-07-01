import type { InventoryGroupId, InventorySubcategoryId } from "@/domain/inventory-taxonomy";
import { INVENTORY_TAXONOMY } from "@/domain/inventory-taxonomy";
import {
  isWarehouseUncategorizedFilter,
  WAREHOUSE_UNCATEGORIZED_FILTER,
  type WarehouseSubcategoryFilter,
} from "@/lib/warehouse/inventory-taxonomy-normalize";
import {
  isPinnedFilterId,
  type PinnedFilterId,
} from "@/lib/navigation/pinned-filters";

export const INVENTORY_COLLECTIONS = [
  "engines",
  "transmissions",
  "parts",
  "consumables",
] as const;

export type InventoryCollectionId = (typeof INVENTORY_COLLECTIONS)[number];

export type InventoryCollectionContext = {
  collection: InventoryCollectionId;
  filter?: PinnedFilterId;
  brandLocalId?: number;
  subcategory?: WarehouseSubcategoryFilter;
};

const TRANSMISSION_SUBCATEGORIES: InventorySubcategoryId[] = ["gearboxes"];

const PARTS_SUBCATEGORIES: InventorySubcategoryId[] = INVENTORY_TAXONOMY.filter(
  (item) => item.groupId === "parts",
).map((item) => item.id);

export function subcategoriesForCollection(
  collection: InventoryCollectionId,
): InventorySubcategoryId[] {
  switch (collection) {
    case "engines":
      return ["engines"];
    case "transmissions":
      return TRANSMISSION_SUBCATEGORIES;
    case "parts":
      return PARTS_SUBCATEGORIES;
    case "consumables":
      return INVENTORY_TAXONOMY.filter((item) => item.groupId === "consumables").map(
        (item) => item.id,
      );
    default:
      return [];
  }
}

export function groupIdForCollection(collection: InventoryCollectionId): InventoryGroupId | null {
  switch (collection) {
    case "engines":
    case "transmissions":
      return "aggregates";
    case "parts":
      return "parts";
    case "consumables":
      return "consumables";
    default:
      return null;
  }
}

export function collectionBasePath(collection: InventoryCollectionId): string {
  return collection === "consumables" ? "/warehouse" : "/motors";
}

export function buildCollectionHref(input: {
  collection: InventoryCollectionId;
  filter?: PinnedFilterId;
  brandLocalId?: number | null;
  subcategory?: WarehouseSubcategoryFilter;
}): string {
  const params = new URLSearchParams();
  params.set("collection", input.collection);
  if (input.filter) params.set("filter", input.filter);
  if (input.brandLocalId != null) params.set("brand", String(input.brandLocalId));
  if (input.subcategory) params.set("subcategory", input.subcategory);
  return `${collectionBasePath(input.collection)}?${params.toString()}`;
}

export function buildBrandHref(input: {
  brandLocalId: number;
  sold?: boolean;
  filter?: PinnedFilterId;
  collection?: InventoryCollectionId;
}): string {
  const path = input.sold ? "/sold" : "/motors";
  const params = new URLSearchParams();
  params.set("collection", input.collection ?? "engines");
  params.set("brand", String(input.brandLocalId));
  if (input.filter) params.set("filter", input.filter);
  return `${path}?${params.toString()}`;
}

export function parseCollectionFromSearchParams(
  params: URLSearchParams | ReadonlyURLSearchParamsLike,
  pathname: string,
): InventoryCollectionContext {
  const rawCollection = params.get("collection");
  let collection: InventoryCollectionId = "engines";

  if (isInventoryCollectionId(rawCollection)) {
    collection = rawCollection;
  } else if (pathname === "/warehouse") {
    collection = "consumables";
  } else if (pathname === "/sold") {
    collection = "engines";
  }

  const filterRaw = params.get("filter");
  const filter = isPinnedFilterId(filterRaw) ? filterRaw : undefined;

  const brandRaw = params.get("brand");
  const brandLocalId =
    brandRaw && Number.isFinite(Number(brandRaw)) ? Number(brandRaw) : undefined;

  const subcategoryRaw = params.get("subcategory");
  let subcategory: WarehouseSubcategoryFilter | undefined;
  if (isWarehouseUncategorizedFilter(subcategoryRaw)) {
    subcategory = WAREHOUSE_UNCATEGORIZED_FILTER;
  } else if (isInventorySubcategoryId(subcategoryRaw)) {
    subcategory = subcategoryRaw;
  }

  return { collection, filter, brandLocalId, subcategory };
}

type ReadonlyURLSearchParamsLike = {
  get(name: string): string | null;
};

export function resolveActiveCollection(
  pathname: string,
  params: URLSearchParams | ReadonlyURLSearchParamsLike,
): InventoryCollectionId {
  return parseCollectionFromSearchParams(params, pathname).collection;
}

export function isInventoryCollectionId(value: unknown): value is InventoryCollectionId {
  return (
    typeof value === "string" &&
    (INVENTORY_COLLECTIONS as readonly string[]).includes(value)
  );
}

function isInventorySubcategoryId(value: unknown): value is InventorySubcategoryId {
  if (typeof value !== "string") return false;
  return INVENTORY_TAXONOMY.some((item) => item.id === value);
}

export function collectionMatchesCategory(
  collection: InventoryCollectionId,
  subcategoryId: InventorySubcategoryId | undefined,
  groupId: InventoryGroupId | undefined,
): boolean {
  if (collection === "engines") return subcategoryId === "engines" || subcategoryId === undefined;
  if (collection === "transmissions") {
    return subcategoryId != null && TRANSMISSION_SUBCATEGORIES.includes(subcategoryId);
  }
  if (collection === "parts") {
    return groupId === "parts" || (subcategoryId != null && PARTS_SUBCATEGORIES.includes(subcategoryId));
  }
  if (collection === "consumables") {
    return groupId === "consumables";
  }
  return false;
}
