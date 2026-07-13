import type { InventoryItem } from '@/types/inventory';

/** Dual-read while free-text warehouseLocation and primaryLocationCode coexist. */
export function resolveInventoryShelf(
  item: Pick<InventoryItem, 'primaryLocationCode' | 'warehouseLocation'>,
): string | undefined {
  const primary = item.primaryLocationCode?.trim();
  if (primary) return primary;
  const legacy = item.warehouseLocation?.trim();
  return legacy || undefined;
}
