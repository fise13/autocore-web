import type { ScanResult } from '@/features/scan/types';
import type { MobileScanResolveResult } from '@/types/inventory';

export function mapResolveResultToScanResult(result: MobileScanResolveResult): ScanResult | null {
  if (!result.found || !result.item) return null;

  const item = result.item;
  const status =
    item.totalAvailable > 0 ? 'in_stock' : item.totalOnHand > 0 ? 'reserved' : 'deficit';

  return {
    id: item.id,
    kind: 'part',
    code: result.barcode,
    title: item.name,
    subtitle: item.sku,
    shelf: item.warehouseLocation,
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
    })),
  };
}

export function matchTypeLabel(matchType: ScanResult['matchType']): string | null {
  switch (matchType) {
    case 'barcode_mapping':
      return 'По штрихкоду';
    case 'sku':
      return 'По артикулу';
    case 'barcode_field':
      return 'По коду на карточке';
    case 'search_token':
      return 'По индексу';
    case 'fuzzy':
      return 'Возможное совпадение';
    case 'ai':
      return 'Найдено AI';
    default:
      return null;
  }
}
