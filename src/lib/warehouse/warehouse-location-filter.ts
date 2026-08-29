import { resolveItemLocationLabel } from "@/lib/warehouse/resolve-item-location-label";

export type LocationFilterItem = {
  primaryLocationCode?: string | null;
  warehouseLocation?: string | null;
};

export type WarehouseLocationFilter =
  | { kind: "all" }
  | { kind: "unlocated" }
  | { kind: "code"; code: string };

export const ALL_LOCATION_FILTER: WarehouseLocationFilter = { kind: "all" };

export function labelMatchesLocationFilter(
  label: string,
  filter: WarehouseLocationFilter,
): boolean {
  if (filter.kind === "all") return true;
  const trimmed = label.trim();
  if (filter.kind === "unlocated") return !trimmed;
  const needle = filter.code.trim().toUpperCase();
  if (!needle) return true;
  const hay = trimmed.toUpperCase();
  return hay === needle || hay.startsWith(`${needle}-`) || hay.startsWith(needle);
}

export function itemMatchesLocationFilter(
  item: LocationFilterItem,
  filter: WarehouseLocationFilter,
): boolean {
  return labelMatchesLocationFilter(resolveItemLocationLabel(item), filter);
}

export function collectLocationFilterOptions(
  items: LocationFilterItem[],
  limit = 12,
): { code: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = resolveItemLocationLabel(item);
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code, "ru"))
    .slice(0, limit);
}

export function countUnlocatedItems(items: LocationFilterItem[]): number {
  return items.reduce((sum, item) => (resolveItemLocationLabel(item) ? sum : sum + 1), 0);
}
