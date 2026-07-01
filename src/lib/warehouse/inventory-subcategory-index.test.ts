import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildConsumablesSubcategoryIndex } from "@/lib/warehouse/inventory-subcategory-index";
import { filterItemsByWarehouseSubcategory } from "@/lib/warehouse/inventory-subcategory-index";
import { WAREHOUSE_UNCATEGORIZED_FILTER } from "@/lib/warehouse/inventory-taxonomy-normalize";
import type { InventoryItem } from "@/domain/inventory";

function item(partial: Partial<InventoryItem> & Pick<InventoryItem, "id" | "sku" | "name">): InventoryItem {
  return {
    companyId: "company",
    type: "consumable",
    barcodes: [],
    unit: "шт",
    currency: "KZT",
    totalOnHand: 1,
    totalReserved: 0,
    totalAvailable: 1,
    stockValue: 0,
    status: "active",
    searchTokens: [],
    ...partial,
  };
}

describe("inventory subcategory index", () => {
  it("indexes consumables by subcategory id and uncategorized bucket", () => {
    const index = buildConsumablesSubcategoryIndex([
      item({ id: "1", sku: "O-1", name: "Масло", subcategoryId: "oils", inventoryGroup: "consumables" }),
      item({ id: "2", sku: "F-1", name: "Фильтр", subcategoryId: "filters", inventoryGroup: "consumables" }),
      item({ id: "3", sku: "X-1", name: "Болт" }),
    ]);

    assert.equal(index.counts.get("oils"), 1);
    assert.equal(index.counts.get("filters"), 1);
    assert.equal(index.uncategorizedCount, 1);
  });

  it("filters warehouse items by virtual uncategorized category", () => {
    const items = [
      item({ id: "1", sku: "O-1", name: "Масло", subcategoryId: "oils" }),
      item({ id: "2", sku: "X-1", name: "Болт" }),
    ];

    const uncategorized = filterItemsByWarehouseSubcategory(items, WAREHOUSE_UNCATEGORIZED_FILTER);
    assert.equal(uncategorized.length, 1);
    assert.equal(uncategorized[0]?.id, "2");
  });
});
