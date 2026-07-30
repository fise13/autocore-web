import { requestAiNormalizeBatch } from "@/infrastructure/openrouter/import-ai-client";
import { NormalizeBatchItem } from "@/lib/warehouse/import/ai-schemas";

import { normalizeImportRow } from "./normalizer";
import { ColumnMappingResult, EnhancedImportRow, ImportProgress } from "./types";

const AI_BATCH_SIZE = 40;
const AI_UNCERTAIN_THRESHOLD = 0.45;

function emit(onProgress: ((progress: ImportProgress) => void) | undefined, progress: ImportProgress) {
  onProgress?.(progress);
}

function summarizeRawRow(raw: Record<string, string>): string {
  return Object.entries(raw)
    .filter(([, value]) => String(value ?? "").trim())
    .map(([key, value]) => `${key}: ${String(value).trim()}`)
    .join(" · ")
    .slice(0, 480);
}

function applyAiSuggestion(
  row: EnhancedImportRow,
  columnMapping: ColumnMappingResult,
  suggestion: NormalizeBatchItem,
): EnhancedImportRow {
  const enrichment = columnMapping.preset?.enrichment;
  const normalized = normalizeImportRow(
    row.raw,
    columnMapping.mapping,
    {
      name: suggestion.normalizedTitle,
      brandName: suggestion.brand,
      category: suggestion.category,
      sku: suggestion.sku,
      barcode: suggestion.barcode,
      quantity: suggestion.quantity,
      purchasePrice: suggestion.purchasePrice,
      sellPrice: suggestion.sellPrice,
    },
    enrichment,
  );

  const uncertain = suggestion.confidence < AI_UNCERTAIN_THRESHOLD;
  const warnings = [...suggestion.warnings];
  if (uncertain) {
    warnings.push("AI isn't confident — review this row before importing");
  }

  return {
    ...row,
    normalized,
    confidence: suggestion.confidence,
    selected: !uncertain && row.errors.length === 0,
    errors: uncertain ? [...row.errors, "Needs review"] : row.errors,
    action: uncertain ? "skip" : row.action,
    summary: uncertain ? "AI isn't confident — row disabled" : row.summary,
    aiMeta: {
      normalizedTitle: suggestion.normalizedTitle,
      brand: suggestion.brand,
      category: suggestion.category,
      confidence: suggestion.confidence,
      duplicateRisk: suggestion.duplicateRisk,
      reasoning: ["Magic Import"],
      warnings,
      source: "ai",
    },
  };
}

export async function magicEnhanceImportRows(
  companyId: string,
  rows: EnhancedImportRow[],
  columnMapping: ColumnMappingResult,
  options?: {
    onProgress?: (progress: ImportProgress) => void;
  },
): Promise<EnhancedImportRow[]> {
  const batches: EnhancedImportRow[][] = [];
  for (let offset = 0; offset < rows.length; offset += AI_BATCH_SIZE) {
    batches.push(rows.slice(offset, offset + AI_BATCH_SIZE));
  }

  const enhanced: EnhancedImportRow[] = [];
  let processed = 0;

  for (const [batchIndex, batch] of batches.entries()) {
    emit(options?.onProgress, {
      phase: "ai",
      current: processed,
      total: rows.length,
      percent: 40 + Math.round((processed / Math.max(rows.length, 1)) * 35),
      message: `AI is parsing rows ${processed + 1}–${processed + batch.length} of ${rows.length}…`,
    });

    const payload = batch.map((row) => ({
      rowIndex: row.rowIndex,
      rawTitle: String(row.normalized.name ?? row.normalized.sku ?? summarizeRawRow(row.raw).slice(0, 120)),
      rawBrand: String(row.normalized.brandName ?? ""),
      rawCategory: Array.isArray(row.normalized.categoryPath)
        ? row.normalized.categoryPath.join(" / ")
        : "",
      rawRow: summarizeRawRow(row.raw),
    }));

    let aiByIndex = new Map<number, NormalizeBatchItem>();
    try {
      const ai = await requestAiNormalizeBatch(companyId, payload);
      aiByIndex = new Map(ai.items.map((item) => [item.rowIndex, item]));
    } catch {
      aiByIndex = new Map();
    }

    for (const row of batch) {
      const suggestion = aiByIndex.get(row.rowIndex);
      if (!suggestion) {
        enhanced.push({
          ...row,
          aiMeta: {
            confidence: 0.85,
            duplicateRisk: row.duplicateConfidence ?? 0,
            reasoning: ["Auto-mapped"],
            warnings: [],
            source: "rules",
          },
        });
        continue;
      }

      enhanced.push(applyAiSuggestion(row, columnMapping, suggestion));
    }

    processed += batch.length;
    if (batchIndex < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  emit(options?.onProgress, {
    phase: "ai",
    current: rows.length,
    total: rows.length,
    percent: 75,
    message: "AI finished parsing — preparing import…",
  });

  return enhanced;
}

export function applyMagicImportDefaults(rows: EnhancedImportRow[]): EnhancedImportRow[] {
  return rows.map((row) => {
    const sku = String(row.normalized.sku ?? "").trim();
    const name = String(row.normalized.name ?? "").trim();
    const hasIdentity = Boolean(sku || name);
    const uncertain = row.aiMeta?.warnings.some((warning) => warning.includes("isn't confident"));
    const qty = Number(row.normalized.quantity ?? 0);
    const errors = uncertain
      ? row.errors.filter((error) => !error.includes("Needs review"))
      : row.errors;

    return {
      ...row,
      errors,
      selected: hasIdentity && errors.length === 0,
      action:
        !hasIdentity || errors.length > 0
          ? "skip"
          : row.duplicateOfItemId
            ? "update"
            : "create",
      summary:
        !hasIdentity
          ? "Couldn't identify the item"
          : uncertain
            ? "Imported with a flag — review later"
            : row.duplicateOfItemId
              ? "Will update the existing item"
              : qty > 0
                ? `Will create · ${qty} pcs`
                : "Will be created",
    };
  });
}
