import { InventoryItem } from "@/domain/inventory";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { createBarcodeMappingRepository } from "@/infrastructure/firestore/barcode-mapping-repository";

import { EnhancedImportRow } from "./types";

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

export async function enrichRowsWithDuplicates(
  companyId: string,
  rows: EnhancedImportRow[],
  itemRepository: InventoryItemRepository,
  existingItems: InventoryItem[] = [],
): Promise<EnhancedImportRow[]> {
  const barcodeRepository = createBarcodeMappingRepository();
  const cache = new Map<string, InventoryItem>();

  async function loadItem(id: string) {
    if (cache.has(id)) return cache.get(id)!;
    const item = await itemRepository.getById(id);
    if (item) cache.set(id, item);
    return item;
  }

  const enriched: EnhancedImportRow[] = [];

  for (const row of rows) {
    const normalized = row.normalized;
    const sku = String(normalized.sku ?? "").trim();
    const barcode = Array.isArray(normalized.barcodes) ? String(normalized.barcodes[0] ?? "") : "";
    const title = String(normalized.name ?? sku);
    const reasons: string[] = [];
    let duplicateOfItemId = row.duplicateOfItemId;
    let duplicateConfidence = row.duplicateConfidence ?? 0;
    let conflictList = row.conflictFields ?? [];

    if (barcode) {
      const mapping = await barcodeRepository.findByBarcode(companyId, barcode);
      if (mapping) {
        duplicateOfItemId = mapping.itemId;
        duplicateConfidence = Math.max(duplicateConfidence, 1);
        reasons.push("Совпадение штрихкода");
      }
    }

    if (sku) {
      const existing = await itemRepository.findBySku(companyId, sku);
      if (existing) {
        duplicateOfItemId = existing.id;
        duplicateConfidence = Math.max(duplicateConfidence, 0.95);
        reasons.push("Совпадение SKU");
        conflictList = [...new Set([...conflictList, ...conflictFields(existing, normalized)])];
      } else if (existingItems.length > 0) {
        let best: { item: InventoryItem; score: number; reason: string } | null = null;
        for (const item of existingItems) {
          const skuDistance = levenshtein(sku.toLowerCase(), item.sku.toLowerCase());
          if (skuDistance <= 2) {
            const score = 0.75 - skuDistance * 0.05;
            if (!best || score > best.score) {
              best = { item, score, reason: "Похожий SKU" };
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
        if (best && best.score >= 0.55) {
          duplicateOfItemId = best.item.id;
          duplicateConfidence = Math.max(duplicateConfidence, best.score);
          reasons.push(best.reason);
          conflictList = [...new Set([...conflictList, ...conflictFields(best.item, normalized)])];
        }
      }
    }

    if (duplicateOfItemId) {
      const existing = await loadItem(duplicateOfItemId);
      if (existing) {
        conflictList = [...new Set([...conflictList, ...conflictFields(existing, normalized)])];
      }
    }

    enriched.push({
      ...row,
      duplicateOfItemId,
      duplicateConfidence,
      duplicateReasons: reasons,
      conflictFields: conflictList,
      duplicateResolution: duplicateOfItemId
        ? row.duplicateResolution ?? "merge"
        : row.duplicateResolution ?? "create",
      action: row.errors.length > 0 ? "skip" : duplicateOfItemId ? "update" : "create",
      summary: row.errors.length > 0
        ? row.errors[0]
        : duplicateOfItemId
          ? "Обновит существующую позицию после подтверждения"
          : "Создаст новую позицию после подтверждения",
    });
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
