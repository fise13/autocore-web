import { suggestColumnMapping } from "@/lib/warehouse/import-rules-engine";

import { ColumnMapAiResponse } from "./ai-schemas";
import { ColumnMappingResult, ImportTargetField, IMPORT_TARGET_FIELDS } from "./types";

const REQUIRED_FIELDS: ImportTargetField[] = ["sku", "name"];

const HEADER_ALIASES: Record<ImportTargetField, string[]> = {
  sku: ["sku", "артикул", "код", "article", "part", "partnumber"],
  name: ["name", "название", "наименование", "товар", "product", "description"],
  category: ["category", "категория", "группа", "type"],
  brandName: ["brand", "бренд", "марка", "manufacturer"],
  supplierName: ["supplier", "поставщик", "vendor"],
  barcode: ["barcode", "штрихкод", "ean", "upc", "bar code"],
  warehouseLocation: ["location", "место", "ячейка", "полка", "склад", "bin"],
  quantity: ["qty", "quantity", "кол-во", "количество", "остаток", "stock", "count"],
  purchasePrice: ["purchase", "закупка", "цена закупки", "cost", "buy", "buyprice"],
  sellPrice: ["sell", "продажа", "цена продажи", "price", "retail"],
  unit: ["unit", "ед", "единица", "uom"],
  lowStockThreshold: ["min", "minimum", "мин", "мин. запас", "порог", "reorder"],
};

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

function headerMatchScore(header: string, alias: string): number {
  const normalizedHeader = header.trim().toLowerCase();
  const normalizedAlias = alias.trim().toLowerCase();
  if (normalizedHeader === normalizedAlias) return 1;
  if (normalizedHeader.includes(normalizedAlias) || normalizedAlias.includes(normalizedHeader)) return 0.85;
  const distance = levenshtein(normalizedHeader, normalizedAlias);
  if (distance <= 2) return Math.max(0.5, 0.85 - distance * 0.1);
  return 0;
}

export function suggestColumnMappingWithConfidence(headers: string[]): ColumnMappingResult {
  const mapping: Record<string, string> = {};
  const fieldConfidence: Partial<Record<ImportTargetField, number>> = {};
  const usedHeaders = new Set<string>();
  const warnings: string[] = [];

  for (const field of IMPORT_TARGET_FIELDS) {
    let bestHeader = "";
    let bestScore = 0;
    for (const header of headers) {
      if (usedHeaders.has(header)) continue;
      const aliases = HEADER_ALIASES[field];
      const score = Math.max(...aliases.map((alias) => headerMatchScore(header, alias)));
      if (score > bestScore) {
        bestScore = score;
        bestHeader = header;
      }
    }
    if (bestHeader && bestScore >= 0.5) {
      mapping[field] = bestHeader;
      fieldConfidence[field] = bestScore;
      usedHeaders.add(bestHeader);
    }
  }

  const legacy = suggestColumnMapping(headers);
  for (const [field, header] of Object.entries(legacy)) {
    if (!mapping[field]) {
      mapping[field] = header;
      fieldConfidence[field as ImportTargetField] = 0.75;
    }
  }

  for (const field of REQUIRED_FIELDS) {
    if (!mapping[field]) {
      warnings.push(`Не найдена колонка для поля «${field}»`);
    }
  }

  const duplicateTargets = new Set<string>();
  for (const header of Object.values(mapping)) {
    if (duplicateTargets.has(header)) {
      warnings.push(`Колонка «${header}» сопоставлена с несколькими полями`);
    }
    duplicateTargets.add(header);
  }

  return {
    mapping,
    fieldConfidence,
    source: "rules",
    reasoning: "Автоматическое сопоставление по алиасам",
    warnings,
  };
}

export function needsAiColumnMapping(result: ColumnMappingResult): boolean {
  const minRequiredConfidence = Math.min(
    ...REQUIRED_FIELDS.map((field) => result.fieldConfidence[field] ?? 0),
  );
  return minRequiredConfidence < 0.6 || result.warnings.length > 0;
}

export function mergeAiColumnMapping(
  base: ColumnMappingResult,
  ai: ColumnMapAiResponse,
): ColumnMappingResult {
  const mapping = { ...base.mapping, ...ai.mappings };
  const fieldConfidence: Partial<Record<ImportTargetField, number>> = { ...base.fieldConfidence };
  for (const field of Object.keys(ai.mappings)) {
    fieldConfidence[field as ImportTargetField] = Math.max(
      fieldConfidence[field as ImportTargetField] ?? 0,
      ai.confidence,
    );
  }
  return {
    mapping,
    fieldConfidence,
    source: "ai",
    reasoning: ai.reasoning,
    warnings: [...base.warnings, ...ai.warnings],
  };
}

export function applyManualColumnMapping(
  base: ColumnMappingResult,
  manualMapping: Record<string, string>,
): ColumnMappingResult {
  const fieldConfidence: Partial<Record<ImportTargetField, number>> = {};
  for (const field of IMPORT_TARGET_FIELDS) {
    if (manualMapping[field]) fieldConfidence[field] = 1;
  }
  return {
    mapping: manualMapping,
    fieldConfidence,
    source: "manual",
    reasoning: "Ручное сопоставление пользователем",
    warnings: base.warnings,
  };
}
