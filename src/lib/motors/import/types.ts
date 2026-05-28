import { SheetColumnMapping } from "@/lib/motors/excel-column-mapping";
import { SheetImportConfig } from "@/lib/motors/excel-sheet-config";
import { ExcelSheetData, ParsedImportMotorRow } from "@/lib/motors/excel-types";

export type MotorImportPhase =
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

export type MotorImportValueSource = "rules" | "ai" | "manual";

export type MotorImportProgress = {
  phase: MotorImportPhase;
  current: number;
  total: number;
  percent: number;
  message?: string;
};

export type MotorSheetMappingResult = {
  config: SheetImportConfig;
  columnMapping: SheetColumnMapping;
  confidence: number;
  source: MotorImportValueSource;
  reasoning?: string;
  warnings: string[];
  detectedSoldSheet: boolean;
};

export type MotorImportDiffAction = "create" | "update" | "skip";

export type MotorImportPreviewRow = ParsedImportMotorRow & {
  rowKey: string;
  rowIndex: number;
  sheetConfigId: string;
  importType: SheetImportConfig["importType"];
  action: MotorImportDiffAction;
  summary: string;
  confidence: number;
  errors: string[];
  warnings: string[];
  selected: boolean;
  duplicateOfMotorId?: string;
  duplicateReasons?: string[];
  conflictFields?: string[];
};

export type MotorImportPreviewResult = {
  sheets: ExcelSheetData[];
  sheetMappings: Record<string, MotorSheetMappingResult>;
  engineRows: MotorImportPreviewRow[];
  specificSheets: Array<{
    configId: string;
    sheetName: string;
    categoryName: string;
    rowCount: number;
    previewSample: Record<string, string>[];
  }>;
  stats: {
    totalEngineRows: number;
    validEngineRows: number;
    duplicates: number;
    errors: number;
    warnings: number;
    specificSheets: number;
  };
  aiNotes?: string;
};

export type MotorImportApplyProgress = {
  applied: number;
  failed: number;
  total: number;
  percent: number;
  cancelled: boolean;
};

export type MotorImportAiRequest =
  | {
      kind: "motorSheetResolve";
      companyId: string;
      sheets: Array<{ sheetName: string; sampleRows: string[][] }>;
      catalog: Array<{ brandName: string; engineCode: string }>;
    }
  | {
      kind: "motorNormalizeBatch";
      companyId: string;
      items: Array<{
        rowKey: string;
        rawSerial?: string;
        rawBrand?: string;
        rawEngine?: string;
      }>;
    };

export type AiMotorColumnRole =
  | "serial_code"
  | "configuration"
  | "notes"
  | "quantity"
  | "transmission"
  | "arrival_date"
  | "sold_date"
  | "ignore";
