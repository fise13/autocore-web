import { InventoryItem, UpsertInventoryItemInput } from "@/domain/inventory";
import {
  InventoryGroupId,
  InventorySubcategoryId,
  InventoryTaxonomySubcategory,
  isInventorySubcategoryId,
  presetForSubcategory,
  resolveSubcategoryForCategoryName,
  subcategoryLabel,
  subcategoriesForGroup,
} from "@/domain/inventory-taxonomy";
import { categoryLabelFromPath, categoryPathFromLabel } from "@/lib/warehouse/warehouse-search";

/** Virtual sidebar / URL filter — not stored on inventory items. */
export const WAREHOUSE_UNCATEGORIZED_FILTER = "uncategorized" as const;

export type WarehouseSubcategoryFilter =
  | InventorySubcategoryId
  | typeof WAREHOUSE_UNCATEGORIZED_FILTER;

export function isWarehouseUncategorizedFilter(
  value: unknown,
): value is typeof WAREHOUSE_UNCATEGORIZED_FILTER {
  return value === WAREHOUSE_UNCATEGORIZED_FILTER;
}

export function consumableSubcategoryIds(): InventorySubcategoryId[] {
  return subcategoriesForGroup("consumables").map((item) => item.id);
}

export function consumableSubcategoryLabels(): string[] {
  return consumableSubcategoryIds().map((id) => subcategoryLabel(id));
}

export function categoryLabelFromSubcategory(
  subcategoryId: InventorySubcategoryId | undefined,
  categoryPath?: string[],
): string {
  if (subcategoryId) return subcategoryLabel(subcategoryId);
  return categoryLabelFromPath(categoryPath);
}

export function resolveConsumableSubcategoryFromText(
  ...parts: Array<string | undefined>
): InventorySubcategoryId | undefined {
  for (const part of parts) {
    const resolved = resolveSubcategoryForCategoryName(part ?? "");
    if (resolved?.groupId === "consumables" && resolved.kind === "warehouse") {
      return resolved.id;
    }
  }

  const combined = parts
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru");

  if (!combined.trim()) return undefined;

  if (/(фильтр|filter)/.test(combined)) return "filters";
  if (/(масл|oil|5w|10w|15w|0w)/.test(combined)) return "oils";
  if (/(антифриз|coolant|тосол)/.test(combined)) return "antifreeze";
  if (/(свеч|spark)/.test(combined)) return "spark_plugs";
  if (/(герметик|sealant)/.test(combined)) return "sealants";

  return undefined;
}

function resolveConsumableTaxonomyPreset(
  ...parts: Array<string | undefined>
): InventoryTaxonomySubcategory | undefined {
  for (const part of parts) {
    const resolved = resolveSubcategoryForCategoryName(part ?? "");
    if (resolved?.groupId === "consumables" && resolved.kind === "warehouse") {
      return resolved;
    }
  }

  const subcategoryId = resolveConsumableSubcategoryFromText(...parts);
  return subcategoryId ? presetForSubcategory(subcategoryId) : undefined;
}

export function isConsumableUncategorized(item: InventoryItem): boolean {
  if (item.status === "archived") return false;
  if (item.inventoryGroup && item.inventoryGroup !== "consumables") return false;
  return !item.subcategoryId;
}

export function normalizeInventoryTaxonomyInput(
  input: UpsertInventoryItemInput,
): UpsertInventoryItemInput {
  const categoryLabel = categoryLabelFromPath(input.categoryPath);
  const resolvedSubcategory =
    (input.subcategoryId && isInventorySubcategoryId(input.subcategoryId)
      ? presetForSubcategory(input.subcategoryId)
      : undefined) ??
    resolveConsumableTaxonomyPreset(categoryLabel, input.name);

  const subcategoryId =
    resolvedSubcategory?.groupId === "consumables"
      ? resolvedSubcategory.id
      : (input.subcategoryId ?? resolvedSubcategory?.id);
  const inventoryGroup: InventoryGroupId =
    input.subcategoryId && presetForSubcategory(input.subcategoryId)
      ? presetForSubcategory(input.subcategoryId)!.groupId
      : (resolvedSubcategory?.groupId ?? input.inventoryGroup ?? "consumables");
  const categoryPath =
    subcategoryId && resolvedSubcategory
      ? categoryPathFromLabel(resolvedSubcategory.label) ?? input.categoryPath
      : input.categoryPath;

  return {
    ...input,
    inventoryGroup,
    subcategoryId,
    categoryPath,
  };
}

export function taxonomyPatchForItem(item: InventoryItem): {
  subcategoryId: InventorySubcategoryId;
  inventoryGroup: InventoryGroupId;
  categoryPath: string[];
} | null {
  if (item.subcategoryId && item.inventoryGroup === "consumables") return null;

  const categoryLabel = categoryLabelFromPath(item.categoryPath);
  const resolved =
    (item.subcategoryId ? presetForSubcategory(item.subcategoryId) : undefined) ??
    resolveConsumableTaxonomyPreset(categoryLabel, item.name);

  if (!resolved || resolved.groupId !== "consumables") return null;

  return {
    subcategoryId: resolved.id,
    inventoryGroup: "consumables",
    categoryPath: categoryPathFromLabel(resolved.label) ?? [resolved.label],
  };
}
