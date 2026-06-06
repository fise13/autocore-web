import { ImportDiffAction, InventoryImportDiffRow } from "@/lib/warehouse/import-rules-engine";
import { PresetEnrichment } from "./format-presets";

export const IMPORT_TARGET_FIELDS = [
  "sku",
  "name",
  "barcode",
  "quantity",
  "supplierName",
  "purchasePrice",
  "sellPrice",
  "category",
  "brandName",
  "warehouseLocation",
  "unit",
  "lowStockThreshold",
] as const;

export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number];

export type ImportPhase =
  | "upload"
  | "parsing"
  | "preprocessing"
  | "mapping"
  | "ai"
  | "preview"
  | "duplicates"
  | "confirm"
  | "applying"
  | "done";

export type ImportValueSource = "rules" | "ai" | "manual" | "preset";

export type ImportPresetMeta = {
  id: string;
  label: string;
  enrichment: PresetEnrichment;
};

export type ParsedImportSheet = {
  sheetName: string;
  headers: string[];
  rows: Record<string, string>[];
  parseWarnings: string[];
};

export type ImportProgress = {
  phase: ImportPhase;
  current: number;
  total: number;
  percent: number;
  message?: string;
};

export type ColumnMappingResult = {
  mapping: Record<string, string>;
  fieldConfidence: Partial<Record<ImportTargetField, number>>;
  source: ImportValueSource;
  reasoning?: string;
  warnings: string[];
  preset?: ImportPresetMeta;
  presetScore?: number;
  quickImport?: boolean;
};

export type DuplicateResolution = "create" | "merge" | "skip";

export type ImportRowAiMeta = {
  normalizedTitle?: string;
  brand?: string;
  category?: string;
  confidence: number;
  duplicateRisk: number;
  reasoning: string[];
  warnings: string[];
  source: ImportValueSource;
};

export type EnhancedImportRow = InventoryImportDiffRow & {
  duplicateConfidence?: number;
  duplicateReasons?: string[];
  conflictFields?: string[];
  duplicateResolution?: DuplicateResolution;
  aiMeta?: ImportRowAiMeta;
  applyStatus?: "pending" | "applied" | "skipped" | "failed";
};

export type ImportPreviewResult = {
  sheets: ParsedImportSheet[];
  selectedSheetName: string;
  columnMapping: ColumnMappingResult;
  rows: EnhancedImportRow[];
  stats: {
    total: number;
    valid: number;
    duplicates: number;
    errors: number;
    warnings?: number;
  };
};

export type ImportApplyOptions = {
  warehouseId?: string;
  createExpense: boolean;
  updateExistingMetadata: boolean;
};

export type ImportApplyProgress = {
  applied: number;
  failed: number;
  total: number;
  percent: number;
  cancelled: boolean;
};

export type WarehouseImportAiRequest =
  | {
      kind: "columnMap";
      companyId: string;
      headers: string[];
      sampleRows: Record<string, string>[];
    }
  | {
      kind: "normalizeBatch";
      companyId: string;
      items: Array<{
        rowIndex: number;
        rawTitle?: string;
        rawBrand?: string;
        rawCategory?: string;
        rawRow?: string;
      }>;
    }
  | {
      kind: "duplicateCluster";
      companyId: string;
      clusterId: string;
      candidates: Array<{
        rowIndex: number;
        sku?: string;
        barcode?: string;
        title?: string;
      }>;
      existingItems: Array<{
        id: string;
        sku: string;
        name: string;
        barcodes?: string[];
      }>;
    };

export type { ImportDiffAction };
