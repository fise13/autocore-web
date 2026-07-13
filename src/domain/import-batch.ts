/**
 * Unified AI Import batches — phone photos, PDFs, Excel/CSV → suggested motor rows → confirm.
 * Complements legacy `documentImports` (photo inbox) and Magic Import (Excel-only wizards).
 */

export const IMPORT_BATCH_STATUSES = [
  "collecting",
  "processing",
  "review",
  "applying",
  "completed",
  "failed",
  "expired",
  "cancelled",
] as const;

export type ImportBatchStatus = (typeof IMPORT_BATCH_STATUSES)[number];

export const IMPORT_BATCH_TARGETS = ["motors", "warehouse", "auto"] as const;
export type ImportBatchTarget = (typeof IMPORT_BATCH_TARGETS)[number];

export const IMPORT_BATCH_AI_STATUSES = ["idle", "processing", "done", "failed"] as const;
export type ImportBatchAiStatus = (typeof IMPORT_BATCH_AI_STATUSES)[number];

export const IMPORT_BATCH_FILE_KINDS = ["image", "pdf", "spreadsheet", "other"] as const;
export type ImportBatchFileKind = (typeof IMPORT_BATCH_FILE_KINDS)[number];

export const IMPORT_BATCH_FILE_STATUSES = [
  "uploading",
  "ready",
  "processing",
  "extracted",
  "failed",
] as const;
export type ImportBatchFileStatus = (typeof IMPORT_BATCH_FILE_STATUSES)[number];

export type ImportBatchCounts = {
  files: number;
  filesReady: number;
  filesFailed: number;
  rows: number;
  rowsAccepted: number;
  rowsLowConfidence: number;
};

export type ImportBatch = {
  id: string;
  companyId: string;
  createdBy: string;
  target: ImportBatchTarget;
  status: ImportBatchStatus;
  aiStatus: ImportBatchAiStatus;
  title?: string;
  counts: ImportBatchCounts;
  expiresAt: Date;
  appliedMotorIds?: string[];
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ImportBatchFile = {
  id: string;
  batchId: string;
  companyId: string;
  kind: ImportBatchFileKind;
  status: ImportBatchFileStatus;
  contentType: string;
  fileName?: string;
  byteSize?: number;
  storagePath: string;
  downloadUrl: string;
  previewStoragePath?: string | null;
  previewDownloadUrl?: string | null;
  width?: number;
  height?: number;
  /** Cached OCR / raw extract text */
  ocrText?: string | null;
  error?: string | null;
  /** Legacy documentImports id when mirrored */
  documentImportId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ImportSuggestedRow = {
  id: string;
  batchId: string;
  companyId: string;
  sourceFileId?: string | null;
  selected: boolean;
  confidence: number;
  serialCode: string;
  brandName: string;
  engineCode: string;
  configuration: string;
  notes: string;
  quantity: number;
  transmission: string;
  vin?: string;
  price?: number | null;
  compatibility?: string;
  errors: string[];
  warnings: string[];
  summary: string;
  createdAt: Date;
  updatedAt: Date;
};

export const EMPTY_IMPORT_BATCH_COUNTS: ImportBatchCounts = {
  files: 0,
  filesReady: 0,
  filesFailed: 0,
  rows: 0,
  rowsAccepted: 0,
  rowsLowConfidence: 0,
};

/** Default batch lifetime before unconfirmed batches expire. */
export const IMPORT_BATCH_TTL_MS = 24 * 60 * 60 * 1000;

export const IMPORT_BATCHES_COLLECTION = "importBatches";
export const IMPORT_BATCH_FILES_SUBCOLLECTION = "files";
export const IMPORT_BATCH_ROWS_SUBCOLLECTION = "suggestedRows";
