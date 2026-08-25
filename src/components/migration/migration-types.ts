/**
 * Business Migration — the types that outlived the row-based wizard.
 *
 * The wizard now runs on `ImportPlan`: it parses in the browser, understands
 * on the server and commits a stored plan, so the review grid, the commit
 * ports, the duplicate panel and their types are gone. What is left is the
 * learning sink the UI still uses, and the row shape the server-side specific
 * catalog writer still speaks — that writer is shared with other importers and
 * is not this wizard's to delete.
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

export type ReviewRowStatus = "pending" | "skipped";

/** One migration row, as the shared server-side catalog writer still expects it. */
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
  photo?: ImageAsset;
  status: ReviewRowStatus;
  edited: boolean;
};

/** A duplicate cluster, as the shared server-side writer still expects it. */
export type DuplicateGroup = {
  field: CanonicalField;
  value: string;
  rowIds: string[];
  resolution: DuplicateResolution;
};

export type DuplicateResolution = "update" | "skip" | "create";

/** Continuous-learning sink: remember a human correction in the company dictionary. */
export type MigrationLearnFn = (input: {
  recordType: RecordType;
  value: string;
}) => void | Promise<void>;
