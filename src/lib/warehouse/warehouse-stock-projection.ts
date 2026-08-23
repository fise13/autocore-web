import { InventoryItem, InventoryStockLevel } from "@/domain/inventory";
import { Warehouse } from "@/domain/warehouse";

function stockValueForItem(item: InventoryItem, onHand: number): number {
  const unitCost = item.averageCost ?? item.purchasePrice ?? 0;
  return onHand * unitCost;
}

/** Main / default warehouse: show full catalog even when stock levels were never written. */
export function isPrimaryWarehouseView(
  warehouse: Warehouse | undefined,
  warehouses: Warehouse[],
): boolean {
  if (!warehouse) return false;
  if (warehouses.length <= 1) return true;
  if (warehouse.isDefault) return true;
  if ((warehouse.code ?? "").trim().toUpperCase() === "MAIN") return true;
  const name = warehouse.name.trim().toLocaleLowerCase("ru");
  return (
    name === "main warehouse" ||
    name === "основной склад" ||
    name === "основной"
  );
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
  const primaryView = isPrimaryWarehouseView(selectedWarehouse, warehouses);

  return items
    .filter((item) => item.status === "active")
    .filter((item) => {
      if (levelByItemId.has(item.id)) return true;
      // Primary warehouse spreadsheet = company catalog. Partial syncs often leave
      // inventoryItems without stock levels (qty 0) — those must still render.
      if (primaryView) return true;
      // Secondary warehouses: only rows that have stock at this location.
      return false;
    })
    .map((item) =>
      projectInventoryItemForWarehouse(item, levelByItemId.get(item.id) ?? null, {
        legacyFallbackOnHand: primaryView ? item.totalOnHand : undefined,
      }),
    );
}
