import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveGroupForCategoryName,
  resolveSubcategoryForCategoryName,
  subcategoryLabel,
} from "@/domain/inventory-taxonomy";
import { normalizeCompanyConfigForTaxonomy } from "@/application/use-cases/migrate-inventory-taxonomy";
import { warehouseItemMatchesSubcategory, warehouseItemMatchesSubcategoryFilter } from "@/lib/warehouse/warehouse-taxonomy";
import {
  resolveConsumableSubcategoryFromText,
  WAREHOUSE_UNCATEGORIZED_FILTER,
} from "@/lib/warehouse/inventory-taxonomy-normalize";

describe("inventory taxonomy", () => {
  it("resolves legacy names to P1 subcategories", () => {
    assert.equal(resolveSubcategoryForCategoryName("Коробки")?.id, "gearboxes");
    assert.equal(resolveSubcategoryForCategoryName("ЭБУ")?.id, "electrical");
    assert.equal(resolveSubcategoryForCategoryName("Фары")?.id, "optics");
    assert.equal(resolveGroupForCategoryName("Насосы"), "aggregates");
    assert.equal(subcategoryLabel("filters"), "Фильтры");
  });

  it("normalizes legacy company category presets", () => {
    const migrated = normalizeCompanyConfigForTaxonomy({
      onboardingCompleted: true,
      modules: {
        motors: true,
        workOrders: true,
        accounting: true,
        warehouse: true,
        specifics: true,
      },
      specificCategories: [
        { id: "gearboxes", name: "Коробки", mode: "tracked", groupId: "parts" },
        { id: "ecu", name: "ЭБУ", mode: "tracked", groupId: "parts" },
        { id: "headlights", name: "Фары", mode: "quick", groupId: "parts" },
      ],
      defaultWarrantyTemplate: "contract_engine",
    });

    assert.equal(migrated.taxonomyVersion, 2);
    assert.deepEqual(
      migrated.specificCategories.map((item) => [item.name, item.groupId, item.subcategoryId]),
      [
        ["КПП", "aggregates", "gearboxes"],
        ["Электрика", "parts", "electrical"],
        ["Оптика", "parts", "optics"],
      ],
    );
  });

  it("matches warehouse items by persisted subcategory id only", () => {
    assert.equal(
      warehouseItemMatchesSubcategory(
        {
          id: "1",
          companyId: "company",
          type: "consumable",
          sku: "OIL-1",
          name: "Масло 5W-30",
          barcodes: [],
          categoryPath: ["Расходники", "Масла"],
          unit: "л",
          currency: "KZT",
          totalOnHand: 1,
          totalReserved: 0,
          totalAvailable: 1,
          stockValue: 0,
          status: "active",
          searchTokens: [],
        },
        "oils",
      ),
      false,
    );

    assert.equal(
      warehouseItemMatchesSubcategory(
        {
          id: "2",
          companyId: "company",
          type: "filter",
          sku: "FLT-1",
          name: "Фильтр",
          barcodes: [],
          subcategoryId: "filters",
          unit: "шт",
          currency: "KZT",
          totalOnHand: 1,
          totalReserved: 0,
          totalAvailable: 1,
          stockValue: 0,
          status: "active",
          searchTokens: [],
        },
        "filters",
      ),
      true,
    );
  });

  it("classifies consumables from product names", () => {
    assert.equal(resolveConsumableSubcategoryFromText("масло 5w30"), "oils");
    assert.equal(resolveConsumableSubcategoryFromText("фильтр масляный"), "filters");
  });

  it("routes uncategorized filter to items without subcategory", () => {
    assert.equal(
      warehouseItemMatchesSubcategoryFilter(
        {
          id: "3",
          companyId: "company",
          type: "generic",
          sku: "X-1",
          name: "Болт",
          barcodes: [],
          unit: "шт",
          currency: "KZT",
          totalOnHand: 1,
          totalReserved: 0,
          totalAvailable: 1,
          stockValue: 0,
          status: "active",
          searchTokens: [],
        },
        WAREHOUSE_UNCATEGORIZED_FILTER,
      ),
      true,
    );
  });
});
