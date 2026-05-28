import { InventoryItem } from "@/domain/inventory";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import {
  requestAiColumnMapping,
  requestAiNormalizeBatch,
} from "@/infrastructure/openrouter/import-ai-client";
import { buildImportDiffRows } from "@/lib/warehouse/import-rules-engine";
import { NormalizeBatchItem } from "@/lib/warehouse/import/ai-schemas";

import {
  applyManualColumnMapping,
  mergeAiColumnMapping,
  needsAiColumnMapping,
  suggestColumnMappingWithConfidence,
} from "./column-mapper";
import { enrichRowsWithDuplicates } from "./duplicate-detector";
import { pickDefaultSheet, readWarehouseSpreadsheet } from "./file-parser";
import { normalizeImportRow } from "./normalizer";
import { rowQualityScore } from "./preprocessor";
import {
  ColumnMappingResult,
  EnhancedImportRow,
  ImportPreviewResult,
  ImportProgress,
  ParsedImportSheet,
} from "./types";
import { validateImportRows } from "./validation";

export type ImportPipelineOptions = {
  companyId: string;
  file: File;
  selectedSheetName?: string;
  manualColumnMapping?: Record<string, string>;
  useAi?: boolean;
  existingItems?: InventoryItem[];
  onProgress?: (progress: ImportProgress) => void;
};

function emit(onProgress: ImportPipelineOptions["onProgress"], progress: ImportProgress) {
  onProgress?.(progress);
}

function buildRowsFromSheet(
  sheet: ParsedImportSheet,
  columnMapping: ColumnMappingResult,
): EnhancedImportRow[] {
  return sheet.rows.map((raw, index) => {
    const normalized = normalizeImportRow(raw, columnMapping.mapping);
    const quality = rowQualityScore(normalized);
    return {
      rowIndex: index + 1,
      raw,
      normalized,
      confidence: Math.max(columnMapping.fieldConfidence.sku ?? 0.5, quality),
      errors: [],
      selected: true,
      action: "create",
      summary: "Создаст новую позицию после подтверждения",
    };
  });
}

async function maybeEnhanceMapping(
  options: ImportPipelineOptions,
  sheet: ParsedImportSheet,
  mapping: ColumnMappingResult,
): Promise<ColumnMappingResult> {
  if (options.manualColumnMapping) {
    return applyManualColumnMapping(mapping, options.manualColumnMapping);
  }
  if (!options.useAi || !needsAiColumnMapping(mapping)) return mapping;
  try {
    emit(options.onProgress, {
      phase: "ai",
      current: 1,
      total: 3,
      percent: 35,
      message: "AI анализирует колонки…",
    });
    const ai = await requestAiColumnMapping(
      options.companyId,
      sheet.headers,
      sheet.rows.slice(0, 3),
    );
    return mergeAiColumnMapping(mapping, ai);
  } catch {
    return mapping;
  }
}

async function maybeEnhanceRowsWithAi(
  options: ImportPipelineOptions,
  rows: EnhancedImportRow[],
  mapping: ColumnMappingResult,
): Promise<EnhancedImportRow[]> {
  if (!options.useAi) return rows;
  const ambiguous = rows
    .filter((row) => row.confidence < 0.75)
    .slice(0, 25)
    .map((row) => ({
      rowIndex: row.rowIndex,
      rawTitle: String(row.normalized.name ?? ""),
      rawBrand: String(row.normalized.brandName ?? ""),
      rawCategory: Array.isArray(row.normalized.categoryPath)
        ? row.normalized.categoryPath.join(" / ")
        : "",
    }));
  if (ambiguous.length === 0) return rows;

  try {
    emit(options.onProgress, {
      phase: "ai",
      current: 2,
      total: 3,
      percent: 55,
      message: "AI нормализует названия…",
    });
    const ai = await requestAiNormalizeBatch(options.companyId, ambiguous);
    const byIndex = new Map<number, NormalizeBatchItem>(
      ai.items.map((item) => [item.rowIndex, item]),
    );
    return rows.map((row) => {
      const suggestion = byIndex.get(row.rowIndex);
      if (!suggestion) return row;
      const normalized = normalizeImportRow(row.raw, mapping.mapping, {
        name: suggestion.normalizedTitle,
        brandName: suggestion.brand,
        category: suggestion.category,
      });
      return {
        ...row,
        normalized,
        confidence: suggestion.confidence,
        aiMeta: {
          normalizedTitle: suggestion.normalizedTitle,
          brand: suggestion.brand,
          category: suggestion.category,
          confidence: suggestion.confidence,
          duplicateRisk: suggestion.duplicateRisk,
          reasoning: ["AI-нормализация"],
          warnings: suggestion.warnings,
          source: "ai",
        },
      };
    });
  } catch {
    return rows;
  }
}

export async function runImportPreviewPipeline(
  itemRepository: InventoryItemRepository,
  options: ImportPipelineOptions,
): Promise<ImportPreviewResult> {
  emit(options.onProgress, {
    phase: "parsing",
    current: 0,
    total: 100,
    percent: 5,
    message: "Чтение файла…",
  });

  const sheets = await readWarehouseSpreadsheet(options.file);
  const selectedSheet =
    sheets.find((sheet) => sheet.sheetName === options.selectedSheetName) ??
    pickDefaultSheet(sheets);
  if (!selectedSheet) {
    throw new Error("Файл не содержит данных для импорта");
  }

  emit(options.onProgress, {
    phase: "preprocessing",
    current: 20,
    total: 100,
    percent: 20,
    message: "Предобработка…",
  });

  let columnMapping = suggestColumnMappingWithConfidence(selectedSheet.headers);
  columnMapping = await maybeEnhanceMapping(options, selectedSheet, columnMapping);

  let rows = buildRowsFromSheet(selectedSheet, columnMapping);
  rows = await maybeEnhanceRowsWithAi(options, rows, columnMapping);

  emit(options.onProgress, {
    phase: "preview",
    current: 70,
    total: 100,
    percent: 70,
    message: "Поиск дубликатов…",
  });

  rows = await enrichRowsWithDuplicates(
    options.companyId,
    rows,
    itemRepository,
    options.existingItems ?? [],
  );
  rows = validateImportRows(rows);
  const diffRows = buildImportDiffRows(rows) as EnhancedImportRow[];

  const stats = {
    total: diffRows.length,
    valid: diffRows.filter((row) => row.errors.length === 0).length,
    duplicates: diffRows.filter((row) => Boolean(row.duplicateOfItemId)).length,
    errors: diffRows.filter((row) => row.errors.length > 0).length,
    warnings: diffRows.filter((row) => (row.aiMeta?.warnings.length ?? 0) > 0).length,
  };

  emit(options.onProgress, {
    phase: "done",
    current: 100,
    total: 100,
    percent: 100,
    message: "Готово к просмотру",
  });

  return {
    sheets,
    selectedSheetName: selectedSheet.sheetName,
    columnMapping,
    rows: diffRows,
    stats,
  };
}
