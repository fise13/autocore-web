import type { CanonicalField, RecordType } from "../types";

/**
 * Contracts for the reasoning half of the business import.
 *
 * The existing engine is a good deterministic mapper: it turns a sheet into
 * rows, each with canonical fields, a record type and a confidence. What it has
 * never had is a layer above the row. Nothing in the pipeline could say "these
 * eleven rows are the same donor", "this part came off that car", or "these two
 * lines are a subtotal, not stock". `analyzeTable` is per-table and `buildRow`
 * is per-row, so a fact that spans rows had nowhere to live.
 *
 * These types are that missing layer, and they are deliberately declarative:
 * an AI pass may *propose* any of them, and deterministic code decides whether
 * the proposal survives. Nothing here can write to a database.
 *
 * Pure — no React, no Firestore, no network.
 */

// ---------------------------------------------------------------------------
// Confidence, per decision rather than per row
// ---------------------------------------------------------------------------

/**
 * What kind of decision a confidence reading is about.
 *
 * A single `confidence: 0.91` on a row cannot say whether the doubt is about
 * *what* the row is, *which* donor it belongs to, or whether "250" was a price
 * at all. Every reading below names its own subject.
 */
export type DecisionKind =
  | "entity"
  | "field"
  | "relationship"
  | "normalization"
  | "duplicate";

export type DecisionSource = "dictionary" | "rules" | "ai" | "manual";

export type Decision = {
  kind: DecisionKind;
  /** 0–1. */
  confidence: number;
  /** Plain sentence a person can read. Never a stack trace or a prompt dump. */
  reason: string;
  source: DecisionSource;
};

export function decision(
  kind: DecisionKind,
  confidence: number,
  reason: string,
  source: DecisionSource,
): Decision {
  return {
    kind,
    confidence: Math.min(1, Math.max(0, Number.isFinite(confidence) ? confidence : 0)),
    reason,
    source,
  };
}

// ---------------------------------------------------------------------------
// Pass 1 — discovery
// ---------------------------------------------------------------------------

/**
 * What a physical row in the sheet *is*, before asking what it describes.
 *
 * Spreadsheets kept by hand are not tables of records. They carry section
 * headings ("СВЕРДЛОВА"), running totals, free-text notes and blank
 * separators, and importing those as stock is how a catalogue acquires an
 * engine called "ИТОГО".
 */
export type RowRole =
  | "record"
  | "section-header"
  | "total"
  | "note"
  | "separator"
  | "repeated-header";

export type DiscoveredRow = {
  /** Index into the source table's rows. */
  index: number;
  role: RowRole;
  /**
   * Section this row sits under, when the sheet is divided by heading rows.
   * Carries context a per-row view cannot see — a branch, a car, a date.
   */
  section: string | null;
  decision: Decision;
};

export type SheetDiscovery = {
  table: string;
  /** Rows that carry data, in source order. */
  recordIndexes: number[];
  rows: DiscoveredRow[];
  /** Section headings found, in source order. */
  sections: string[];
};

export type ImportDiscovery = {
  sheets: SheetDiscovery[];
  /** Rows that will never become entities, with the reason. */
  ignored: Array<{ table: string; index: number; role: RowRole; reason: string }>;
};

// ---------------------------------------------------------------------------
// Pass 2 — business ontology
// ---------------------------------------------------------------------------

/**
 * Entities the import can produce. A superset of `RecordType`, which only ever
 * described *stock* — a spreadsheet also records who bought a part and for how
 * much, and those facts had no type to become.
 *
 * Types beyond the stock ones are recognised and planned, but only committed
 * once the commit path grows a writer for them; see `PLANNABLE_ONLY`.
 */
export const IMPORT_ENTITY_KINDS = [
  "donor",
  "engine",
  "usedPart",
  "stockItem",
  "sale",
  "customer",
  "supplier",
  "expense",
  "unknown",
] as const;

export type ImportEntityKind = (typeof IMPORT_ENTITY_KINDS)[number];

/**
 * Entities the pipeline can describe but the commit path cannot yet write.
 * They appear in the plan so a person sees what was understood, and are
 * reported as deferred rather than silently dropped.
 */
export const PLANNABLE_ONLY: ReadonlySet<ImportEntityKind> = new Set([
  "sale",
  "customer",
  "supplier",
  "expense",
]);

/** Stock record types map onto entity kinds one-for-one. */
export const ENTITY_KIND_BY_RECORD_TYPE: Record<RecordType, ImportEntityKind> = {
  engine: "engine",
  transmission: "stockItem",
  transferCase: "stockItem",
  reducer: "stockItem",
  turbo: "stockItem",
  body: "usedPart",
  optics: "usedPart",
  suspension: "usedPart",
  electrical: "usedPart",
  consumable: "stockItem",
  donorCar: "donor",
  unknown: "unknown",
};

/** Where a row came from, kept on every entity for the audit trail. */
export type SourceRef = {
  table: string;
  /** Row index within that table. */
  index: number;
  /** Section heading the row sat under, when there was one. */
  section?: string | null;
};

/**
 * A value the import understood, with the original preserved.
 *
 * Normalization must never destroy what the sheet said: when a merge later
 * turns out wrong, `raw` is the only way back.
 */
export type ImportValue = {
  raw: string;
  normalized: string;
  decision: Decision;
};

export type EntityDraft = {
  /** Stable within one import run. */
  id: string;
  kind: ImportEntityKind;
  /** Canonical fields, each keeping its original text. */
  values: Partial<Record<CanonicalField, ImportValue>>;
  /** Every source row that contributed — more than one after resolution. */
  sources: SourceRef[];
  /** Identity keys this entity was matched on, folded for comparison. */
  keys: EntityKey[];
  decision: Decision;
  /** Why a person needs to look, when they do. */
  review: ReviewReason[];
};

/** A key strong enough to say two rows are the same thing. */
export type EntityKey = {
  field: "vin" | "serial" | "sku";
  /** Folded value used for comparison. */
  value: string;
};

export type ReviewReasonCode =
  | "ambiguous-entity"
  | "ambiguous-numeric-value"
  | "conflicting-values"
  | "uncertain-relationship"
  | "destructive-merge"
  | "invalid-business-data"
  | "low-confidence-financial"
  | "unsupported-entity";

export type ReviewReason = {
  code: ReviewReasonCode;
  message: string;
  field?: CanonicalField;
};

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

export const RELATIONSHIP_KINDS = [
  "part-of-donor",
  "engine-of-donor",
  "sale-of-part",
  "sale-to-customer",
] as const;

export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

export type RelationshipDraft = {
  kind: RelationshipKind;
  /** Entity draft id. */
  fromId: string;
  /** Entity draft id. */
  toId: string;
  decision: Decision;
};

// ---------------------------------------------------------------------------
// Pass 5 — the plan
// ---------------------------------------------------------------------------

export type PlanVerb = "create" | "update" | "merge" | "skip" | "review";

export type PlanAction = {
  entityId: string;
  kind: ImportEntityKind;
  verb: PlanVerb;
  /** Existing record this action targets, for update and merge. */
  existingId?: string;
  /** Entity drafts folded into this one by a merge. */
  mergedFrom?: string[];
  decision: Decision;
  review: ReviewReason[];
};

export type ImportPlan = {
  /** Stable across retries of the same file, so a resumed run is idempotent. */
  importId: string;
  companyId: string;
  actions: PlanAction[];
  relationships: RelationshipDraft[];
  entities: Record<string, EntityDraft>;
  discovery: ImportDiscovery;
  summary: ImportPlanSummary;
};

export type ImportPlanSummary = {
  /** Per entity kind, how many of each verb. */
  byKind: Record<ImportEntityKind, { create: number; update: number; merge: number; skip: number; review: number }>;
  relationships: Record<RelationshipKind, number>;
  /** Rows the discovery pass refused to treat as data. */
  ignoredRows: number;
  /** Entity kinds understood but not yet writable. */
  deferred: ImportEntityKind[];
  totalActions: number;
  needsReview: number;
};

export function emptyKindTally(): ImportPlanSummary["byKind"] {
  return IMPORT_ENTITY_KINDS.reduce(
    (acc, kind) => {
      acc[kind] = { create: 0, update: 0, merge: 0, skip: 0, review: 0 };
      return acc;
    },
    {} as ImportPlanSummary["byKind"],
  );
}

export function emptyRelationshipTally(): ImportPlanSummary["relationships"] {
  return RELATIONSHIP_KINDS.reduce(
    (acc, kind) => {
      acc[kind] = 0;
      return acc;
    },
    {} as ImportPlanSummary["relationships"],
  );
}
