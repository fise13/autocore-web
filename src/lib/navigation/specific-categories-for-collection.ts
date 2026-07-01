import type { SpecificCategoryEntity } from "@/infrastructure/firestore/specific-category-repository";
import {
  collectionMatchesCategory,
  type InventoryCollectionId,
} from "@/lib/navigation/inventory-collections";
import { isLikelyMotorCatalogName } from "@/lib/motors/import/specific-category-intelligence";

export function specificCategoriesForCollection(
  collection: InventoryCollectionId,
  categories: SpecificCategoryEntity[],
): SpecificCategoryEntity[] {
  if (collection === "engines" || collection === "consumables") return [];

  if (collection === "transmissions") {
    return categories.filter(
      (category) =>
        !isLikelyMotorCatalogName(category.name) &&
        category.subcategoryId === "gearboxes",
    );
  }

  return categories.filter((category) => {
    if (isLikelyMotorCatalogName(category.name)) return false;
    return collectionMatchesCategory(collection, category.subcategoryId, category.groupId);
  });
}

/** Default «КПП» sheet — transmissions use a single catalog, not separate aggregate tabs. */
export function resolveDefaultGearboxCategory(
  categories: SpecificCategoryEntity[],
): SpecificCategoryEntity | null {
  const matches = specificCategoriesForCollection("transmissions", categories);
  if (matches.length === 0) return null;
  return (
    matches.find((category) => category.subcategoryId === "gearboxes") ??
    matches.find((category) => /кпп/i.test(category.name)) ??
    matches[0] ??
    null
  );
}

export function collectionUsesSpecificSheets(collection: InventoryCollectionId): boolean {
  return collection === "parts";
}
