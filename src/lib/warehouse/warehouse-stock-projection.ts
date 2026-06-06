import { InventoryItem, InventoryStockLevel } from "@/domain/inventory";
import { Warehouse } from "@/domain/warehouse";

function stockValueForItem(item: InventoryItem, onHand: number): number {
  const unitCost = item.averageCost ?? item.purchasePrice ?? 0;
  return onHand * unitCost;
}

export function projectInventoryItemForWarehouse(
  item: InventoryItem,
  stockLevel: InventoryStockLevel | null,
  options?: { legacyFallbackOnHand?: number },
): InventoryItem {
  const onHand = stockLevel?.onHand ?? options?.legacyFallbackOnHand ?? 0;
  const reserved = stockLevel?.reserved ?? 0;
  const available = stockLevel?.available ?? Math.max(0, onHand - reserved);

  return {
    ...item,
    totalOnHand: onHand,
    totalReserved: reserved,
    totalAvailable: available,
    stockValue: stockValueForItem(item, onHand),
  };
}

export function projectItemsForWarehouse(
  items: InventoryItem[],
  stockLevels: InventoryStockLevel[],
  warehouseId: string,
  warehouses: Warehouse[],
): InventoryItem[] {
  if (!warehouseId) return [];

  const levelsForWarehouse = stockLevels.filter((level) => level.warehouseId === warehouseId);
  const levelByItemId = new Map(levelsForWarehouse.map((level) => [level.itemId, level]));
  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === warehouseId);
  const allowLegacyFallback =
    warehouses.length === 1 || selectedWarehouse?.isDefault === true;

  return items
    .filter((item) => item.status === "active")
    .filter((item) => {
      if (levelByItemId.has(item.id)) return true;
      return allowLegacyFallback && item.totalOnHand > 0;
    })
    .map((item) =>
      projectInventoryItemForWarehouse(item, levelByItemId.get(item.id) ?? null, {
        legacyFallbackOnHand: allowLegacyFallback ? item.totalOnHand : undefined,
      }),
    );
}
