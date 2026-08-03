import {
  isInventorySubcategoryId,
  resolveSubcategoryForCategoryName,
  type InventorySubcategoryId,
} from "@/domain/inventory-taxonomy";
import { userCopy } from "@/lib/user-copy";

type CategoryNameSource = {
  id?: string;
  name: string;
  subcategoryId?: string | null;
};

function localizedPresetNames(): Partial<Record<InventorySubcategoryId | string, string>> {
  return userCopy.onboarding.setupWizard.categories.names ?? {};
}

/**
 * Locale-aware label for inventory catalog categories.
 * Prefers subcategory/id presets, then taxonomy alias resolution, then stored name.
 */
export function categoryDisplayName(category: CategoryNameSource): string {
  const names = localizedPresetNames();
  const byId = category.subcategoryId?.trim() || category.id?.trim();
  if (byId && names[byId]) return names[byId]!;

  const resolved = resolveSubcategoryForCategoryName(category.name);
  if (resolved && names[resolved.id]) return names[resolved.id]!;
  if (resolved && isInventorySubcategoryId(resolved.id)) return resolved.label;

  return category.name;
}
