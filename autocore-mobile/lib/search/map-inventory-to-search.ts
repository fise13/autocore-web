import type { SearchEngine, SearchResultItem } from '@/features/search/types';
import { inventoryCardSubtitle, normalizeInventoryCode } from '@/features/search/lib/format';
import { joinSearchFields, matchesSearchQuery } from '@/lib/search/match-query';
import type { InventoryItem } from '@/types/inventory';

function inventoryStatus(item: InventoryItem): SearchEngine['status'] {
  if (item.totalAvailable <= 0) return 'deficit';
  return 'in_stock';
}

function inventoryVehicleLabel(item: InventoryItem): string {
  if (item.brandName && item.name && item.brandName !== item.name) {
    return `${item.brandName} · ${item.name}`;
  }
  return item.brandName ?? item.name ?? '';
}

export function mapInventoryItemToSearchEngine(item: InventoryItem): SearchEngine {
  const code = normalizeInventoryCode(item.sku?.trim() || item.name);
  const vehicle = inventoryCardSubtitle(code, inventoryVehicleLabel(item)) ?? '';

  return {
    id: item.id,
    code,
    vehicle,
    status: inventoryStatus(item),
    shelf: item.warehouseLocation?.trim() || undefined,
    price: item.sellPrice ?? 0,
  };
}

export function mapInventoryItemToSearchResult(item: InventoryItem): SearchResultItem {
  return {
    id: item.id,
    kind: 'part',
    title: item.name,
    subtitle: item.sku,
    meta: `${item.totalAvailable} ${item.unit}`,
    shelf: item.warehouseLocation,
    price: item.sellPrice,
    status: inventoryStatus(item),
  };
}

export function inventoryMatchesQuery(item: InventoryItem, query: string): boolean {
  const haystack = joinSearchFields(
    item.name,
    item.sku,
    item.brandName,
    item.description,
    item.warehouseLocation,
    ...(item.barcodes ?? []),
  );
  return matchesSearchQuery(haystack, query);
}
