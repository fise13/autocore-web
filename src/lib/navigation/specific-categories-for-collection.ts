import type { SpecificCategoryEntity } from "@/infrastructure/firestore/specific-category-repository";
import { resolveSubcategoryForCategoryName } from "@/domain/inventory-taxonomy";
import {
  collectionMatchesCategory,
  type InventoryCollectionId,
} from "@/lib/navigation/inventory-collections";
import { isLikelyMotorCatalogName } from "@/lib/motors/import/specific-category-intelligence";

const GEARBOX_NAME_RE = /кпп|короб|gearbox|transmission|акпп|мкпп|akpp|mkpp/i;

function isGearboxCategory(category: SpecificCategoryEntity): boolean {
  if (category.subcategoryId === "gearboxes") return true;
  const inferred = resolveSubcategoryForCategoryName(category.name);
  if (inferred?.id === "gearboxes") return true;
  if (category.groupId === "aggregates" && GEARBOX_NAME_RE.test(category.name)) return true;
  return GEARBOX_NAME_RE.test(category.name.trim());
}

export function specificCategoriesForCollection(
  collection: InventoryCollectionId,
  categories: SpecificCategoryEntity[],
): SpecificCategoryEntity[] {
  if (collection === "engines" || collection === "consumables") return [];

  if (collection === "transmissions") {
    return categories.filter(
      (category) => !isLikelyMotorCatalogName(category.name) && isGearboxCategory(category),
    );
  }

  return categories.filter((category) => {
    if (isLikelyMotorCatalogName(category.name)) return false;
    if (isGearboxCategory(category)) return false;
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
    matches.find((category) => /^кпп$/i.test(category.name.trim())) ??
    matches.find((category) => GEARBOX_NAME_RE.test(category.name)) ??
    matches[0] ??
    null
  );
}

export function collectionUsesSpecificSheets(collection: InventoryCollectionId): boolean {
  return collection === "parts";
}
