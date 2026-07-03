import type { SearchEngine, SearchResultItem } from '@/features/search/types';
import type { InventoryItem } from '@/types/inventory';

function inventoryStatus(item: InventoryItem): SearchEngine['status'] {
  if (item.totalAvailable <= 0) return 'deficit';
  if (item.totalAvailable <= 3) return 'reserved';
  return 'in_stock';
}

export function mapInventoryItemToSearchEngine(item: InventoryItem): SearchEngine {
  return {
    id: item.id,
    code: item.sku || item.name,
    vehicle: item.brandName ? `${item.brandName} · ${item.name}` : item.name,
    status: inventoryStatus(item),
    shelf: item.warehouseLocation ?? '—',
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
  const haystack = [item.name, item.sku, item.brandName, item.description, ...(item.barcodes ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}
