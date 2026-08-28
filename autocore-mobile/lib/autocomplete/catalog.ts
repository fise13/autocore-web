import type { InventoryItem } from '@/types/inventory';

import type { AutocompleteOption } from './types';

function unitPrice(item: InventoryItem): number {
  return item.sellPrice ?? item.purchasePrice ?? 0;
}

const LABOR_INVENTORY_TYPES = new Set(['service', 'installation']);

export function isLaborCatalogItem(item: InventoryItem): boolean {
  return LABOR_INVENTORY_TYPES.has(item.type);
}

export function inventoryToChipOption(
  item: InventoryItem,
  kind: 'service' | 'part',
): AutocompleteOption {
  const commitValue = kind === 'part' && item.sku ? item.sku : item.name;
  return {
    value: commitValue,
    label: item.name,
    keywords: [item.name, item.sku, item.brandName].filter(Boolean).join(' '),
    meta: {
      title: item.name,
      sku: item.sku || undefined,
      price: unitPrice(item),
      chipKind: kind,
      stockCount: item.totalAvailable,
    },
  };
}

export function laborCatalogOptions(items: readonly InventoryItem[]): AutocompleteOption[] {
  return items
    .filter((item) => item.status === 'active' && isLaborCatalogItem(item))
    .map((item) => inventoryToChipOption(item, 'service'));
}

export function partCatalogOptions(
  items: readonly InventoryItem[],
  commitBy: 'sku' | 'name',
): AutocompleteOption[] {
  return items
    .filter((item) => item.status === 'active' && !isLaborCatalogItem(item))
    .map((item) =>
      inventoryToChipOption(item, 'part'),
    )
    .map((option) =>
      commitBy === 'name' && option.meta?.title
        ? { ...option, value: option.meta.title }
        : option,
    );
}

export function filterCatalogItems<T>(
  items: readonly T[],
  query: string,
  searchFields: ReadonlyArray<(item: T) => string>,
  limit = 8,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const matched: T[] = [];
  for (const item of items) {
    const haystack = searchFields.map((field) => field(item)).join(' ').toLowerCase();
    if (!haystack.includes(needle)) continue;
    matched.push(item);
    if (matched.length >= limit) break;
  }
  return matched;
}
