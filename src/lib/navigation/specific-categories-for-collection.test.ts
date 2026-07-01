import assert from "node:assert/strict";
import test from "node:test";

import type { SpecificCategoryEntity } from "@/infrastructure/firestore/specific-category-repository";
import { syncSpecificCategoryForCollection } from "@/hooks/use-inventory-collection-sync";
import { specificCategoriesForCollection, collectionUsesSpecificSheets } from "@/lib/navigation/specific-categories-for-collection";

function category(
  partial: Pick<SpecificCategoryEntity, "id" | "name" | "groupId" | "subcategoryId">,
): SpecificCategoryEntity {
  return {
    localId: 1,
    companyId: "c1",
    columnSchema: [],
    ...partial,
  };
}

test("specificCategoriesForCollection separates parts and transmissions", () => {
  const categories = [
    category({ id: "gearbox", name: "КПП", groupId: "aggregates", subcategoryId: "gearboxes" }),
    category({ id: "turbo", name: "Турбины", groupId: "aggregates", subcategoryId: "turbos" }),
    category({ id: "optics", name: "Оптика", groupId: "parts", subcategoryId: "optics" }),
  ];

  assert.deepEqual(
    specificCategoriesForCollection("transmissions", categories).map((item) => item.id),
    ["gearbox"],
  );
  assert.deepEqual(
    specificCategoriesForCollection("parts", categories).map((item) => item.id),
    ["optics"],
  );
  assert.deepEqual(specificCategoriesForCollection("engines", categories), []);
});

test("syncSpecificCategoryForCollection clears motors selection on engines", () => {
  let selected: string | null = "optics";
  syncSpecificCategoryForCollection({
    collection: "engines",
    categories: [],
    selectedCategoryId: selected,
    setSelectedCategoryId: (value) => {
      selected = value;
    },
  });
  assert.equal(selected, null);
});

test("syncSpecificCategoryForCollection drops invalid sheet when collection changes", () => {
  const categories = [
    category({ id: "gearbox", name: "КПП", groupId: "aggregates", subcategoryId: "gearboxes" }),
    category({ id: "optics", name: "Оптика", groupId: "parts", subcategoryId: "optics" }),
  ];

  let selected: string | null = "optics";
  syncSpecificCategoryForCollection({
    collection: "transmissions",
    categories,
    selectedCategoryId: selected,
    setSelectedCategoryId: (value) => {
      selected = value;
    },
  });
  assert.equal(selected, "gearbox");
});

test("collectionUsesSpecificSheets is parts-only", () => {
  assert.equal(collectionUsesSpecificSheets("parts"), true);
  assert.equal(collectionUsesSpecificSheets("transmissions"), false);
});
