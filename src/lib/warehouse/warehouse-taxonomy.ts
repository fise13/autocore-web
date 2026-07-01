import { InventoryItem } from "@/domain/inventory";
import { InventorySubcategoryId } from "@/domain/inventory-taxonomy";
import {
  isConsumableUncategorized,
  isWarehouseUncategorizedFilter,
  type WarehouseSubcategoryFilter,
} from "@/lib/warehouse/inventory-taxonomy-normalize";

export function warehouseItemMatchesSubcategory(
  item: InventoryItem,
  subcategoryId: InventorySubcategoryId,
): boolean {
  if (item.subcategoryId === subcategoryId) return true;
  return false;
}

export function warehouseItemMatchesSubcategoryFilter(
  item: InventoryItem,
  filter: WarehouseSubcategoryFilter,
): boolean {
  if (isWarehouseUncategorizedFilter(filter)) {
    return isConsumableUncategorized(item);
  }
  return warehouseItemMatchesSubcategory(item, filter);
}
