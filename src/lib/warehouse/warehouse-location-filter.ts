import type { InventoryItem } from "@/domain/inventory";
import { resolveItemLocationLabel } from "@/lib/warehouse/resolve-item-location-label";

export type WarehouseLocationFilter =
  | { kind: "all" }
  | { kind: "unlocated" }
  | { kind: "code"; code: string };

export const ALL_LOCATION_FILTER: WarehouseLocationFilter = { kind: "all" };

export function itemMatchesLocationFilter(
  item: Pick<InventoryItem, "primaryLocationCode" | "warehouseLocation">,
  filter: WarehouseLocationFilter,
): boolean {
  const label = resolveItemLocationLabel(item);
  if (filter.kind === "all") return true;
  if (filter.kind === "unlocated") return !label;
  const needle = filter.code.trim().toUpperCase();
  if (!needle) return true;
  const hay = label.toUpperCase();
  return hay === needle || hay.startsWith(`${needle}-`) || hay.startsWith(needle);
}

export function collectLocationFilterOptions(
  items: Array<Pick<InventoryItem, "primaryLocationCode" | "warehouseLocation">>,
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

export function countUnlocatedItems(
  items: Array<Pick<InventoryItem, "primaryLocationCode" | "warehouseLocation">>,
): number {
  return items.reduce((sum, item) => (resolveItemLocationLabel(item) ? sum : sum + 1), 0);
}
