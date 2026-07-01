import { InventoryItem } from "@/domain/inventory";
import { InventorySubcategoryId } from "@/domain/inventory-taxonomy";
import {
  consumableSubcategoryIds,
  isConsumableUncategorized,
  WAREHOUSE_UNCATEGORIZED_FILTER,
  type WarehouseSubcategoryFilter,
} from "@/lib/warehouse/inventory-taxonomy-normalize";

export type ConsumablesSubcategoryIndex = {
  activeItems: InventoryItem[];
  bySubcategory: Map<InventorySubcategoryId, InventoryItem[]>;
  uncategorized: InventoryItem[];
  counts: Map<InventorySubcategoryId, number>;
  uncategorizedCount: number;
};

export function buildConsumablesSubcategoryIndex(
  items: InventoryItem[],
): ConsumablesSubcategoryIndex {
  const activeItems = items.filter((item) => item.status !== "archived");
  const bySubcategory = new Map<InventorySubcategoryId, InventoryItem[]>();
  const counts = new Map<InventorySubcategoryId, number>();
  const uncategorized: InventoryItem[] = [];

  for (const subcategoryId of consumableSubcategoryIds()) {
    bySubcategory.set(subcategoryId, []);
    counts.set(subcategoryId, 0);
  }

  for (const item of activeItems) {
    if (isConsumableUncategorized(item)) {
      uncategorized.push(item);
      continue;
    }
    const subcategoryId = item.subcategoryId;
    if (!subcategoryId || !bySubcategory.has(subcategoryId)) continue;
    bySubcategory.get(subcategoryId)!.push(item);
    counts.set(subcategoryId, (counts.get(subcategoryId) ?? 0) + 1);
  }

  return {
    activeItems,
    bySubcategory,
    uncategorized,
    counts,
    uncategorizedCount: uncategorized.length,
  };
}

export function filterItemsByWarehouseSubcategory(
  items: InventoryItem[],
  filter: WarehouseSubcategoryFilter | null | undefined,
): InventoryItem[] {
  if (!filter) return items;
  if (filter === WAREHOUSE_UNCATEGORIZED_FILTER) {
    return items.filter(isConsumableUncategorized);
  }
  return items.filter((item) => item.subcategoryId === filter);
}
