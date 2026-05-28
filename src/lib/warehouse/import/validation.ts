import { EnhancedImportRow } from "./types";

export function validateImportRow(row: EnhancedImportRow): EnhancedImportRow {
  const errors = [...row.errors];
  const warnings: string[] = [...(row.aiMeta?.warnings ?? [])];
  const normalized = row.normalized;
  const sku = String(normalized.sku ?? "").trim();
  const name = String(normalized.name ?? "").trim();
  const quantity = Number(normalized.quantity ?? 0);
  const purchasePrice = normalized.purchasePrice != null ? Number(normalized.purchasePrice) : undefined;
  const sellPrice = normalized.sellPrice != null ? Number(normalized.sellPrice) : undefined;

  if (!sku) errors.push("SKU обязателен");
  if (!name && !sku) errors.push("Название обязательно");
  if (!Number.isFinite(quantity)) errors.push("Некорректное количество");
  if (quantity < 0) errors.push("Количество не может быть отрицательным");
  if (purchasePrice != null && !Number.isFinite(purchasePrice)) errors.push("Некорректная закупочная цена");
  if (sellPrice != null && !Number.isFinite(sellPrice)) errors.push("Некорректная цена продажи");
  if (
    purchasePrice != null &&
    sellPrice != null &&
    Number.isFinite(purchasePrice) &&
    Number.isFinite(sellPrice) &&
    sellPrice < purchasePrice
  ) {
    warnings.push("Цена продажи ниже закупочной");
  }
  if (quantity > 0 && (purchasePrice == null || purchasePrice === 0)) {
    warnings.push("Приход без закупочной цены");
  }

  const confidenceBase = row.aiMeta?.confidence ?? row.confidence;
  const errorPenalty = errors.length * 0.15;
  const confidence = Math.max(0.1, confidenceBase - errorPenalty);

  return {
    ...row,
    errors,
    confidence,
    aiMeta: row.aiMeta
      ? { ...row.aiMeta, warnings: [...new Set([...row.aiMeta.warnings, ...warnings])] }
      : warnings.length
        ? {
            confidence,
            duplicateRisk: row.duplicateConfidence ?? 0,
            reasoning: row.duplicateReasons ?? [],
            warnings,
            source: "rules",
          }
        : undefined,
    selected: row.selected && errors.length === 0,
    action: errors.length > 0 ? "skip" : row.action,
  };
}

export function validateImportRows(rows: EnhancedImportRow[]): EnhancedImportRow[] {
  return rows.map(validateImportRow);
}
