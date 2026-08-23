import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { InventoryItem, InventoryStockLevel } from "@/domain/inventory";
import type { Warehouse } from "@/domain/warehouse";
import {
  isPrimaryWarehouseView,
  projectItemsForWarehouse,
} from "@/lib/warehouse/warehouse-stock-projection";

function item(partial: Partial<InventoryItem> & Pick<InventoryItem, "id" | "sku" | "name">): InventoryItem {
  return {
    companyId: "co",
    type: "consumable",
    barcodes: [],
    unit: "pcs",
    currency: "USD",
    totalOnHand: 0,
    totalReserved: 0,
    totalAvailable: 0,
    stockValue: 0,
    status: "active",
    searchTokens: [],
    inventoryGroup: "consumables",
    ...partial,
  };
}

function warehouse(partial: Partial<Warehouse> & Pick<Warehouse, "id" | "name">): Warehouse {
  return {
    companyId: "co",
    isDefault: false,
    ...partial,
  };
}

describe("warehouse stock projection", () => {
  it("treats основной as a primary warehouse view", () => {
    const main = warehouse({ id: "w1", name: "основной", code: "MAIN" });
    assert.equal(isPrimaryWarehouseView(main, [main, warehouse({ id: "w2", name: "Shop" })]), true);
  });

  it("shows zero-qty catalog rows on the primary warehouse without stock levels", () => {
    const main = warehouse({ id: "w1", name: "основной", isDefault: false, code: "MAIN" });
    const rows = projectItemsForWarehouse(
      [
        item({ id: "a", sku: "OF-001", name: "Oil Filter", totalOnHand: 0 }),
        item({ id: "b", sku: "OF-002", name: "Air Filter", totalOnHand: 12 }),
      ],
      [],
      main.id,
      [main],
    );

    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.totalOnHand, 0);
    assert.equal(rows[1]?.totalOnHand, 12);
  });

  it("hides items without stock levels on a secondary warehouse", () => {
    const main = warehouse({ id: "w1", name: "Main warehouse", isDefault: true });
    const shop = warehouse({ id: "w2", name: "Shop" });
    const levels: InventoryStockLevel[] = [
      {
        id: "lvl",
        companyId: "co",
        itemId: "a",
        warehouseId: shop.id,
        onHand: 3,
        reserved: 0,
        available: 3,
      },
    ];

    const shopRows = projectItemsForWarehouse(
      [item({ id: "a", sku: "OF-001", name: "Oil Filter" }), item({ id: "b", sku: "OF-002", name: "Air Filter" })],
      levels,
      shop.id,
      [main, shop],
    );

    assert.equal(shopRows.length, 1);
    assert.equal(shopRows[0]?.id, "a");
    assert.equal(shopRows[0]?.totalOnHand, 3);
  });
});
