/**
 * Business Migration — UI-layer types.
 *
 * These sit between the pure Import Engine and the React experience. The engine
 * stays framework-agnostic; everything here is about presenting and editing a
 * migration. Persistence is abstracted behind {@link MigrationCommitPort} so the
 * same experience can target Firestore today and a mobile bridge later.
 */

import type {
  CanonicalField,
  Confidence,
  ImageAsset,
  RecordSuggestion,
  RecordTarget,
  RecordType,
  RowExplanation,
  RowIssue,
} from "@/lib/import";

export type MigrationPhase =
  | "idle"
  | "analyzing"
  | "recognition"
  | "review"
  | "migrating"
  | "completed"
  | "error";

export type ReviewRowStatus = "pending" | "skipped";

/** One editable migration row, merged across every detected sheet. */
export type ReviewRow = {
  /** Stable id, "tableIndex:rowIndex". */
  id: string;
  /** Source sheet/file label. */
  source: string;
  values: Partial<Record<CanonicalField, string>>;
  recordType: RecordType;
  target: RecordTarget;
  confidence: Confidence;
  explanation: RowExplanation;
  suggestions: RecordSuggestion[];
  issues: RowIssue[];
  /** Attached photo, if matched. */
  photo?: ImageAsset;
  status: ReviewRowStatus;
  /** True once a human edited type/value (drives continuous learning). */
  edited: boolean;
};

/** Detected column mapping for one sheet, for the "Review detected fields" panel. */
export type ReviewTableMapping = {
  /** Stable id — file sheets often share default names like "Sheet". */
  id: string;
  name: string;
  fields: Array<{ field: CanonicalField; header: string; confidence: Confidence }>;
  unmappedHeaders: string[];
};

/**
 * Aggregated business-recognition summary shown after analysis.
 *
 * Every field is derived from the same set of {@link ReviewRow}s so the numbers
 * are internally consistent: `recognized + needsReview === totalRows`, and the
 * category breakdown (`byType` + `unknown`) also sums to `totalRows`. Photos are
 * assets, never rows, so they are tracked separately.
 */
export type RecognitionSummary = {
  totalRows: number;
  /** Rows the engine classified with high confidence. */
  recognized: number;
  /** Rows below high confidence — they surface first in Review. */
  needsReview: number;
  /** Rows with no detected record type. */
  unknown: number;
  byType: Array<{ type: RecordType; label: string; count: number }>;
  photos: number;
  unmatchedPhotos: number;
  duplicates: number;
  /** Estimated migration time, seconds. */
  etaSeconds: number;
  tableCount: number;
};

/** A duplicate cluster the user must resolve. */
export type DuplicateGroup = {
  field: CanonicalField;
  value: string;
  rowIds: string[];
  resolution: DuplicateResolution;
};

export type DuplicateResolution = "update" | "skip" | "create";

/** A staged progress bar during migration. */
export type MigrationStage = {
  key: string;
  label: string;
  total: number;
  done: number;
};

export type MigrationProgress = {
  stages: MigrationStage[];
  /** 0–1 overall. */
  percent: number;
  activeStageKey: string | null;
};

export type MigrationResult = {
  imported: Array<{ type: RecordType; label: string; count: number }>;
  updated: number;
  skipped: number;
  needsReview: number;
  errors: number;
  /** Token used to undo this migration, when supported. */
  undoToken?: string;
  reportRows: ReviewRow[];
};

/** Input handed to the commit port. */
export type MigrationCommitInput = {
  companyId?: string;
  rows: ReviewRow[];
  duplicates: DuplicateGroup[];
};

/**
 * Persistence abstraction. The default implementation animates staged progress
 * for the experience; a Firestore implementation routes rows to the existing
 * motor / inventory / vehicle use cases. The UI never imports persistence.
 */
export type MigrationCommitPort = {
  commit: (
    input: MigrationCommitInput,
    onProgress: (progress: MigrationProgress) => void,
    shouldCancel?: () => boolean,
  ) => Promise<MigrationResult>;
  undo?: (undoToken: string) => Promise<void>;
  canUndo: boolean;
};

/** Continuous-learning sink: remember a human correction in the company dictionary. */
export type MigrationLearnFn = (input: {
  recordType: RecordType;
  value: string;
}) => void | Promise<void>;
