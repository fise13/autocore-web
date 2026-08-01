import { normalizeCompanyId } from '@/lib/company-id';
import { queryClient } from '@/lib/query-client';
import { normalizeScanPayload, scanPayloadKey } from '@/lib/scan/normalize-scan-payload';
import type { InventoryItem, MobileScanItem, MobileScanResolveResult } from '@/types/inventory';

function toMobileScanItem(item: InventoryItem): MobileScanItem {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    unit: item.unit,
    barcodes: item.barcodes,
    brandName: item.brandName,
    warehouseLocation: item.warehouseLocation,
    primaryLocationCode: item.primaryLocationCode,
    sellPrice: item.sellPrice,
    purchasePrice: item.purchasePrice,
    totalOnHand: item.totalOnHand,
    totalReserved: item.totalReserved,
    totalAvailable: item.totalAvailable,
    lowStockThreshold: item.lowStockThreshold,
  };
}

function itemMatchesPayload(item: InventoryItem, key: string): 'sku' | 'barcode_field' | null {
  if (item.status === 'archived') return null;

  const skuKey = scanPayloadKey(item.sku);
  if (skuKey && skuKey === key) return 'sku';

  for (const barcode of item.barcodes ?? []) {
    if (scanPayloadKey(barcode) === key) return 'barcode_field';
  }

  return null;
}

/**
 * Instant barcode resolve against the already-warmed realtime inventory catalog.
 * Avoids a network round-trip for the common exact SKU / barcode hit.
 */
export function resolveBarcodeFromLocalCatalog(
  companyId: string | null | undefined,
  barcode: string,
): MobileScanResolveResult | null {
  if (!companyId) return null;

  const key = scanPayloadKey(barcode);
  if (!key) return null;

  const scopedCompanyId = normalizeCompanyId(companyId);
  const items = queryClient.getQueryData<InventoryItem[]>([
    'realtime',
    'inventory-items',
    scopedCompanyId,
  ]);
  if (!items?.length) return null;

  const hits: Array<{ item: InventoryItem; matchType: 'sku' | 'barcode_field' }> = [];

  for (const item of items) {
    const matchType = itemMatchesPayload(item, key);
    if (matchType) hits.push({ item, matchType });
  }

  if (hits.length === 0) return null;

  const normalized = normalizeScanPayload(barcode) || barcode.trim();

  if (hits.length === 1) {
    const hit = hits[0]!;
    const mobileItem = toMobileScanItem(hit.item);
    return {
      found: true,
      confidence: 1,
      barcode: normalized,
      matchType: hit.matchType,
      item: mobileItem,
      candidates: [],
      stockLevels:
        hit.item.totalOnHand > 0 || hit.item.totalAvailable > 0
          ? [
              {
                warehouseId: 'local',
                warehouseName: hit.item.warehouseLocation?.trim() || 'Warehouse',
                onHand: hit.item.totalOnHand,
                reserved: hit.item.totalReserved,
                available: hit.item.totalAvailable,
              },
            ]
          : [],
    };
  }

  return {
    found: false,
    confidence: 0.7,
    barcode: normalized,
    matchType: hits[0]!.matchType,
    item: null,
    candidates: hits.slice(0, 8).map((hit) => ({
      item: toMobileScanItem(hit.item),
      score: hit.matchType === 'sku' ? 0.95 : 0.9,
      reason: hit.matchType === 'sku' ? 'sku' : 'barcode',
    })),
    stockLevels: [],
  };
}
