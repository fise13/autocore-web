export const INVENTORY_IMPORT_STATUSES = [
  "parsing",
  "preview",
  "applying",
  "completed",
  "failed",
  "cancelled",
  "rolled_back",
] as const;

export type InventoryImportStatus = (typeof INVENTORY_IMPORT_STATUSES)[number];

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

export type InventoryImportRow = {
  rowIndex: number;
  raw: Record<string, string>;
  normalized: Record<string, string | number | string[] | undefined>;
  confidence: number;
  errors: string[];
  duplicateOfItemId?: string;
  selected: boolean;
  action?: "create" | "update" | "skip";
  summary?: string;
  duplicateConfidence?: number;
  duplicateReasons?: string[];
  conflictFields?: string[];
  duplicateResolution?: "create" | "merge" | "skip";
  aiMeta?: {
    normalizedTitle?: string;
    brand?: string;
    category?: string;
    confidence: number;
    duplicateRisk: number;
    reasoning: string[];
    warnings: string[];
    source: ImportValueSource;
  };
};

export type InventoryImportJob = {
  id: string;
  companyId: string;
  status: InventoryImportStatus;
  phase?: ImportPhase;
  progress?: {
    current: number;
    total: number;
    percent: number;
    message?: string;
  };
  sourceFileName?: string;
  columnMapping: Record<string, string>;
  columnMappingSource?: ImportValueSource;
  rows: InventoryImportRow[];
  stats: {
    total: number;
    valid: number;
    duplicates: number;
    errors: number;
    warnings?: number;
  };
  rollbackMovementIds?: string[];
  appliedSummary?: {
    applied: number;
    failed: number;
  };
  rowsStoredInSubcollection?: boolean;
  rowCount?: number;
  createdByUserId: string;
  createdAt: Date;
  updatedAt?: Date;
  errorMessage?: string;
};
