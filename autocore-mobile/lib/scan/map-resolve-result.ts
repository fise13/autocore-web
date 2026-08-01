import type { ScanResult } from '@/features/scan/types';
import type { MobileScanResolveResult } from '@/types/inventory';

export function mapResolveResultToScanResult(result: MobileScanResolveResult): ScanResult | null {
  if (!result.found || !result.item) return null;

  const item = result.item;
  const status =
    item.totalAvailable > 0 ? 'in_stock' : item.totalOnHand > 0 ? 'reserved' : 'deficit';
  const shelf = item.primaryLocationCode?.trim() || item.warehouseLocation?.trim() || undefined;

  return {
    id: item.id,
    kind: 'part',
    code: result.barcode,
    title: item.name,
    subtitle: item.sku,
    shelf,
    price: item.sellPrice,
    status,
    matchType: result.matchType,
    confidence: result.confidence,
    stockLevels: result.stockLevels,
    aiReasoning: result.aiReasoning,
    candidates: result.candidates.map((candidate) => ({
      id: candidate.item.id,
      sku: candidate.item.sku,
      name: candidate.item.name,
      score: candidate.score,
      reason: candidate.reason,
      sellPrice: candidate.item.sellPrice,
      totalAvailable: candidate.item.totalAvailable,
      brandName: candidate.item.brandName,
      warehouseLocation:
        candidate.item.primaryLocationCode?.trim() || candidate.item.warehouseLocation,
    })),
  };
}

export function matchTypeLabel(matchType: ScanResult['matchType']): string | null {
  switch (matchType) {
    case 'barcode_mapping':
      return 'By barcode';
    case 'sku':
      return 'By SKU';
    case 'barcode_field':
      return 'By item code';
    case 'search_token':
      return 'By index';
    case 'fuzzy':
      return 'Possible match';
    case 'ai':
      return 'Found by AI';
    default:
      return null;
  }
}
