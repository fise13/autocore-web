import { buildSkuFallbackHeaders, findInternalIdHeader } from "./sku-resolver";
import { ImportTargetField } from "./types";

export type PresetEnrichment = {
  quantityIncomingHeader?: string;
  quantityOutgoingHeader?: string;
  barcodeFallbackHeader?: string;
  barcodeFallbackHeaders?: string[];
  skuFallbackHeaders?: string[];
  internalIdHeader?: string;
};

export type ImportFormatPreset = {
  id: string;
  label: string;
  score: (headers: string[]) => number;
  build: (headers: string[]) => {
    mapping: Partial<Record<ImportTargetField, string>>;
    enrichment: PresetEnrichment;
  };
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function hasHeader(headers: string[], ...candidates: string[]): boolean {
  const normalized = headers.map(normalizeHeader);
  return candidates.some((candidate) => {
    const needle = normalizeHeader(candidate);
    return normalized.some((header) => header === needle || header.includes(needle));
  });
}

function findHeader(headers: string[], ...candidates: string[]): string | undefined {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const needle = normalizeHeader(candidate);
    const exactIndex = normalized.findIndex((header) => header === needle);
    if (exactIndex >= 0) return headers[exactIndex];
  }
  for (const candidate of candidates) {
    const needle = normalizeHeader(candidate);
    const partialIndex = normalized.findIndex((header) => header.includes(needle));
    if (partialIndex >= 0) return headers[partialIndex];
  }
  return undefined;
}

/** Экспорт «Номенклатура» из учётных систем автосервисов (RU). */
const nomenclaturePreset: ImportFormatPreset = {
  id: "ru-nomenclature",
  label: "Номенклатура (RU)",
  score(headers) {
    let score = 0;
    if (hasHeader(headers, "наименование")) score += 0.25;
    if (hasHeader(headers, "штрихкод")) score += 0.2;
    if (hasHeader(headers, "код номенклатуры", "оригинальный номер")) score += 0.2;
    if (hasHeader(headers, "приход", "расход")) score += 0.15;
    if (hasHeader(headers, "цена прихода", "цена продажи")) score += 0.1;
    if (hasHeader(headers, "единица измерения", "производитель")) score += 0.1;
    return score;
  },
  build(headers) {
    const mapping: Partial<Record<ImportTargetField, string>> = {};
    const sku = findHeader(headers, "код номенклатуры", "артикул");
    const name = findHeader(headers, "наименование", "название");
    const barcode = findHeader(headers, "штрихкод", "ean", "barcode");
    const category = findHeader(headers, "группа", "категория");
    const brandName = findHeader(headers, "производитель", "бренд", "марка");
    const purchasePrice = findHeader(headers, "цена прихода", "закупка");
    const sellPrice = findHeader(headers, "цена: цена продажи", "цена продажи", "продажа");
    const unit = findHeader(headers, "единица измерения", "ед.");
    const lowStockThreshold = findHeader(headers, "минимальный остаток", "мин. запас");
    const quantityIncoming = findHeader(headers, "приход");
    const quantityOutgoing = findHeader(headers, "расход");
    const barcodeFallback = findHeader(headers, "оригинальный номер", "код номенклатуры");
    const skuFallbackHeaders = buildSkuFallbackHeaders(headers);
    const internalIdHeader = findInternalIdHeader(headers);
    const barcodeFallbackHeaders = [
      findHeader(headers, "оригинальный номер"),
      findHeader(headers, "номер производителя"),
      findHeader(headers, "штрихкод"),
      findHeader(headers, "код номенклатуры"),
    ].filter(Boolean) as string[];

    if (sku) mapping.sku = sku;
    if (name) mapping.name = name;
    if (barcode) mapping.barcode = barcode;
    if (category) mapping.category = category;
    if (brandName) mapping.brandName = brandName;
    if (purchasePrice) mapping.purchasePrice = purchasePrice;
    if (sellPrice) mapping.sellPrice = sellPrice;
    if (unit) mapping.unit = unit;
    if (lowStockThreshold) mapping.lowStockThreshold = lowStockThreshold;

    return {
      mapping,
      enrichment: {
        quantityIncomingHeader: quantityIncoming,
        quantityOutgoingHeader: quantityOutgoing,
        barcodeFallbackHeader: barcodeFallback,
        barcodeFallbackHeaders,
        skuFallbackHeaders,
        internalIdHeader,
      },
    };
  },
};

const PRESETS: ImportFormatPreset[] = [nomenclaturePreset];

const PRESET_SCORE_THRESHOLD = 0.75;

export function detectImportFormatPreset(headers: string[]): {
  preset: ImportFormatPreset;
  mapping: Partial<Record<ImportTargetField, string>>;
  enrichment: PresetEnrichment;
  score: number;
} | null {
  let best: {
    preset: ImportFormatPreset;
    mapping: Partial<Record<ImportTargetField, string>>;
    enrichment: PresetEnrichment;
    score: number;
  } | null = null;

  for (const preset of PRESETS) {
    const score = preset.score(headers);
    if (score < PRESET_SCORE_THRESHOLD) continue;
    const built = preset.build(headers);
    if (!built.mapping.name) continue;
    if (!built.mapping.sku && built.enrichment.skuFallbackHeaders?.length === 0 && !built.enrichment.internalIdHeader) {
      continue;
    }
    if (!best || score > best.score) {
      best = { preset, mapping: built.mapping, enrichment: built.enrichment, score };
    }
  }

  return best;
}

export function isQuickImportReady(
  presetScore: number,
  stats: { valid: number; total: number; errors: number },
): boolean {
  return (
    presetScore >= 0.85 &&
    stats.total > 0 &&
    stats.errors === 0 &&
    stats.valid === stats.total
  );
}
