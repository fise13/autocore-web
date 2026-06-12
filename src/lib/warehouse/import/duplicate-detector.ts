import { InventoryItem } from "@/domain/inventory";

import { EnhancedImportRow } from "./types";

const FUZZY_MAX_ROWS = 80;
const FUZZY_MAX_EXISTING = 150;

type ExistingIndexes = {
  bySku: Map<string, InventoryItem>;
  byBarcode: Map<string, InventoryItem>;
  byId: Map<string, InventoryItem>;
};

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}

function tokenSet(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[\s,/+-]+/)
      .filter(Boolean),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function conflictFields(existing: InventoryItem, normalized: Record<string, unknown>): string[] {
  const conflicts: string[] = [];
  const purchasePrice = normalized.purchasePrice != null ? Number(normalized.purchasePrice) : undefined;
  const sellPrice = normalized.sellPrice != null ? Number(normalized.sellPrice) : undefined;
  if (purchasePrice != null && existing.purchasePrice != null && purchasePrice !== existing.purchasePrice) {
    conflicts.push("purchasePrice");
  }
  if (sellPrice != null && existing.sellPrice != null && sellPrice !== existing.sellPrice) {
    conflicts.push("sellPrice");
  }
  return conflicts;
}

function buildExistingIndexes(existingItems: InventoryItem[]): ExistingIndexes {
  const bySku = new Map<string, InventoryItem>();
  const byBarcode = new Map<string, InventoryItem>();
  const byId = new Map<string, InventoryItem>();

  for (const item of existingItems) {
    byId.set(item.id, item);
    const skuKey = item.sku.trim().toLowerCase();
    if (skuKey) bySku.set(skuKey, item);
    for (const code of item.barcodes) {
      const normalized = code.trim().replace(/\s+/g, "");
      if (normalized) byBarcode.set(normalized, item);
    }
  }

  return { bySku, byBarcode, byId };
}

function findFuzzyDuplicate(
  sku: string,
  title: string,
  existingItems: InventoryItem[],
): { item: InventoryItem; score: number; reason: string } | null {
  let best: { item: InventoryItem; score: number; reason: string } | null = null;
  for (const item of existingItems) {
    const skuDistance = levenshtein(sku.toLowerCase(), item.sku.toLowerCase());
    if (skuDistance <= 2) {
      const score = 0.75 - skuDistance * 0.05;
      if (!best || score > best.score) {
        best = { item, score, reason: "Похожий артикул" };
      }
    }
    const titleScore = jaccard(tokenSet(title), tokenSet(item.name));
    if (titleScore >= 0.65) {
      const score = titleScore * 0.6;
      if (!best || score > best.score) {
        best = { item, score, reason: "Похожее название" };
      }
    }
  }
  if (best && best.score >= 0.55) return best;
  return null;
}

function enrichSingleRow(
  row: EnhancedImportRow,
  indexes: ExistingIndexes,
  existingItems: InventoryItem[],
  allowFuzzy: boolean,
): EnhancedImportRow {
  const normalized = row.normalized;
  const sku = String(normalized.sku ?? "").trim();
  const skuKey = sku.toLowerCase();
  const barcode = Array.isArray(normalized.barcodes)
    ? String(normalized.barcodes[0] ?? "").trim().replace(/\s+/g, "")
    : "";
  const title = String(normalized.name ?? sku);
  const reasons: string[] = [];
  let duplicateOfItemId = row.duplicateOfItemId;
  let duplicateConfidence = row.duplicateConfidence ?? 0;
  let conflictList = row.conflictFields ?? [];

  if (barcode) {
    const byBarcode = indexes.byBarcode.get(barcode);
    if (byBarcode) {
      duplicateOfItemId = byBarcode.id;
      duplicateConfidence = Math.max(duplicateConfidence, 1);
      reasons.push("Совпадение штрихкода");
    }
  }

  if (sku) {
    const bySku = indexes.bySku.get(skuKey);
    if (bySku) {
      duplicateOfItemId = bySku.id;
      duplicateConfidence = Math.max(duplicateConfidence, 0.95);
      reasons.push("Совпадение артикула");
      conflictList = [...new Set([...conflictList, ...conflictFields(bySku, normalized)])];
    } else if (allowFuzzy && existingItems.length > 0) {
      const fuzzy = findFuzzyDuplicate(sku, title, existingItems);
      if (fuzzy) {
        duplicateOfItemId = fuzzy.item.id;
        duplicateConfidence = Math.max(duplicateConfidence, fuzzy.score);
        reasons.push(fuzzy.reason);
        conflictList = [...new Set([...conflictList, ...conflictFields(fuzzy.item, normalized)])];
      }
    }
  }

  if (duplicateOfItemId) {
    const existing = indexes.byId.get(duplicateOfItemId);
    if (existing) {
      conflictList = [...new Set([...conflictList, ...conflictFields(existing, normalized)])];
    }
  }

  return {
    ...row,
    duplicateOfItemId,
    duplicateConfidence,
    duplicateReasons: reasons,
    conflictFields: conflictList,
    duplicateResolution: duplicateOfItemId
      ? (row.duplicateResolution ?? "merge")
      : (row.duplicateResolution ?? "create"),
    action: row.errors.length > 0 ? "skip" : duplicateOfItemId ? "update" : "create",
    summary:
      row.errors.length > 0
        ? row.errors[0]
        : duplicateOfItemId
          ? "Обновит существующую позицию после подтверждения"
          : "Создаст новую позицию после подтверждения",
  };
}

export async function enrichRowsWithDuplicates(
  _companyId: string,
  rows: EnhancedImportRow[],
  _itemRepository: unknown,
  existingItems: InventoryItem[] = [],
  options?: {
    onProgress?: (current: number, total: number) => void;
  },
): Promise<EnhancedImportRow[]> {
  if (rows.length === 0) return [];

  const indexes = buildExistingIndexes(existingItems);
  const allowFuzzy =
    rows.length <= FUZZY_MAX_ROWS && existingItems.length <= FUZZY_MAX_EXISTING;
  const enriched: EnhancedImportRow[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    enriched.push(enrichSingleRow(rows[index], indexes, existingItems, allowFuzzy));
    if (index % 25 === 0 || index === rows.length - 1) {
      options?.onProgress?.(index + 1, rows.length);
      if (index % 100 === 0 && index > 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  return enriched;
}

export function groupDuplicateClusters(rows: EnhancedImportRow[]): EnhancedImportRow[][] {
  const clusters = new Map<string, EnhancedImportRow[]>();
  for (const row of rows) {
    const key = row.duplicateOfItemId ?? `new:${String(row.normalized.sku ?? row.rowIndex)}`;
    const group = clusters.get(key) ?? [];
    group.push(row);
    clusters.set(key, group);
  }
  return [...clusters.values()].filter((group) => group.length > 1 || group[0]?.duplicateOfItemId);
}
