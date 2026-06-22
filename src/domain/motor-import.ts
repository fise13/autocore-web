import { SheetColumnMapping } from "@/lib/motors/excel-column-mapping";
import { SheetImportConfig } from "@/lib/motors/excel-sheet-config";
import { MotorImportPreviewRow } from "@/lib/motors/import/types";

export const MOTOR_IMPORT_STATUSES = [
  "queued",
  "analyzing",
  "preview",
  "applying",
  "completed",
  "failed",
  "cancelled",
  "rolled_back",
] as const;

export type MotorImportStatus = (typeof MOTOR_IMPORT_STATUSES)[number];

export type MotorImportJobProgress = {
  phase: "analyze" | "apply";
  percent: number;
  message?: string;
  current?: number;
  total?: number;
};

export type MotorImportJob = {
  id: string;
  companyId: string;
  status: MotorImportStatus;
  progress?: MotorImportJobProgress;
  storagePath?: string;
  quickImport?: boolean;
  autoApply?: boolean;
  processAttempts?: number;
  sourceFileName?: string;
  sheetConfigs: SheetImportConfig[];
  columnMappings: Record<string, SheetColumnMapping>;
  engineRows: MotorImportPreviewRow[];
  stats: {
    totalEngineRows: number;
    validEngineRows: number;
    duplicates: number;
    errors: number;
    warnings: number;
    specificSheets: number;
  };
  specificSheetsPreview?: Array<{
    configId: string;
    sheetName: string;
    categoryName: string;
    rowCount: number;
  }>;
  rowCount?: number;
  aiNotes?: string;
  appliedSummary?: {
    imported: number;
    updated: number;
    skipped: number;
    specificRecordsImported: number;
  };
  rollbackSnapshot?: {
    createdMotorIds: string[];
    updatedMotorIds: string[];
    createdBrandIds?: string[];
    createdEngineIds?: string[];
  };
  rowsStoredInSubcollection?: boolean;
  createdByUserId: string;
  createdAt: Date;
  updatedAt?: Date;
  errorMessage?: string;
};
