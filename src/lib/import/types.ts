/**
 * AutoCore Business Import Engine — unified types.
 *
 * One engine powers every import surface (motors, warehouse, future mobile and
 * AI agents). The pipeline is deliberately framework-agnostic: it takes a
 * {@link ParsedTable} and returns an {@link ImportAnalysis} without touching
 * React, Firestore or the network. The Domain Dictionary is always the first
 * classifier; AI is a pluggable fallback (see {@link ImportAiPort}).
 */

import type { DomainCategory, DomainEntry } from "@/lib/domain/types";

/**
 * Canonical destination fields the engine knows how to detect. These are the
 * stable, business-level columns every AutoCore record maps onto, independent
 * of the source spreadsheet's wording or language.
 */
export const CANONICAL_FIELDS = [
  "name",
  "sku",
  "serial",
  "vin",
  "brand",
  "model",
  "year",
  "price",
  "currency",
  "mileage",
  "quantity",
  "category",
  "subcategory",
  "condition",
  "comment",
  "photo",
  "warehouse",
  "location",
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

/**
 * Business record types AutoCore can auto-detect for an imported row. Each maps
 * onto the destination domain (a motor, a warehouse part, a donor vehicle).
 */
export const RECORD_TYPES = [
  "engine",
  "transmission",
  "transferCase",
  "reducer",
  "turbo",
  "body",
  "optics",
  "suspension",
  "electrical",
  "consumable",
  "donorCar",
  "unknown",
] as const;

export type RecordType = (typeof RECORD_TYPES)[number];

/** Where the engine writes a given record type. */
export type RecordTarget = "motor" | "inventory" | "vehicle";

/** Confidence buckets used everywhere in the UI (🟢 / 🟡 / 🔴). */
export type ConfidenceTier = "high" | "medium" | "low";

/**
 * A normalized confidence reading. `score` is always 0–1 so motors, warehouse,
 * the Domain Engine (raw 0–1000) and AI (raw 0–1) all speak the same language.
 */
export type Confidence = {
  /** 0–1, clamped. */
  score: number;
  tier: ConfidenceTier;
  /** Human-readable Russian explanation shown in the review table. */
  reason: string;
  /** Who produced the reading. */
  source: ImportValueSource;
};

export type ImportValueSource = "dictionary" | "rules" | "ai" | "manual";

/** A single parsed sheet/table, already cleaned into header + string rows. */
export type ParsedTable = {
  /** Sheet name, file name, or other human label. */
  name: string;
  headers: string[];
  rows: Record<string, string>[];
  /** Soft warnings collected while parsing (merged cells, empty rows…). */
  parseWarnings: string[];
  /** Origin file, for multi-file (ZIP) imports. */
  sourceFile?: string;
};

/** A header → canonical field detection with provenance. */
export type DetectedColumn = {
  /** The source header text. */
  header: string;
  /** Detected destination field, or null when nothing matched. */
  field: CanonicalField | null;
  confidence: Confidence;
  /** Alternative candidates, best-first, for the mapping editor. */
  alternatives: Array<{ field: CanonicalField; score: number }>;
};

/** The resolved header → field mapping for a table (one column per field). */
export type ColumnMapping = {
  /** canonical field → source header. */
  fields: Partial<Record<CanonicalField, string>>;
  /** Per-column detection details, in source order. */
  columns: DetectedColumn[];
  /** Whether mapping is confident enough to skip the AI column step. */
  needsAi: boolean;
};

/** A record-type classification for one row. */
export type RowClassification = {
  recordType: RecordType;
  target: RecordTarget;
  confidence: Confidence;
  /** The dictionary entry that matched, when classification used the dictionary. */
  matchedEntry?: DomainEntry;
};

/** A fully analyzed import row, ready for review/edit. */
export type ClassifiedRow = {
  /** Stable index into the source table (0-based, excludes header). */
  index: number;
  /** Raw values keyed by source header. */
  raw: Record<string, string>;
  /** Canonical values extracted via the column mapping. */
  values: Partial<Record<CanonicalField, string>>;
  classification: RowClassification;
  /** Overall row confidence (min of field + classification signals). */
  confidence: Confidence;
  /** Per-field confidence, for cell-level colouring. */
  fieldConfidence: Partial<Record<CanonicalField, Confidence>>;
  /** Why the row needs attention (missing required field, low score…). */
  issues: RowIssue[];
  /** True when the dictionary could not classify and AI is recommended. */
  needsAi: boolean;
};

export type RowIssueKind =
  | "missing-required"
  | "low-confidence"
  | "duplicate"
  | "invalid-value"
  | "unknown-type";

export type RowIssue = {
  kind: RowIssueKind;
  field?: CanonicalField;
  message: string;
};

export type ImportAnalysisStats = {
  total: number;
  recognized: number;
  needsReview: number;
  errors: number;
  duplicates: number;
  missingFields: number;
};

/** The full output of {@link analyzeTable}. */
export type ImportAnalysis = {
  table: ParsedTable;
  mapping: ColumnMapping;
  rows: ClassifiedRow[];
  stats: ImportAnalysisStats;
  /** Dominant record type across the table, when the sheet is homogeneous. */
  dominantRecordType: RecordType;
};

/**
 * Pluggable AI fallback. The core never imports OpenRouter/Firebase directly —
 * callers inject an implementation (server callable, mobile bridge, mock).
 * The engine only calls it for rows the Domain Dictionary could not resolve.
 */
export type ImportAiPort = {
  classifyRows?: (input: AiClassifyRequest) => Promise<AiClassifyResult[]>;
  mapColumns?: (input: AiColumnRequest) => Promise<AiColumnResult>;
};

export type AiClassifyRequest = {
  companyId?: string;
  rows: Array<{ index: number; sample: string }>;
};

export type AiClassifyResult = {
  index: number;
  recordType: RecordType;
  brand?: string;
  model?: string;
  confidence: number;
};

export type AiColumnRequest = {
  companyId?: string;
  headers: string[];
  sampleRows: Record<string, string>[];
};

export type AiColumnResult = {
  fields: Partial<Record<CanonicalField, string>>;
  confidence: number;
};

/** Map a record type onto the dictionary categories that can confirm it. */
export const RECORD_TYPE_DOMAINS: Record<RecordType, DomainCategory[]> = {
  engine: ["engines"],
  transmission: ["transmissions"],
  transferCase: ["transmissions"],
  reducer: ["transmissions"],
  turbo: ["engines", "consumables"],
  body: ["bodyParts"],
  optics: ["bodyParts"],
  suspension: ["bodyParts"],
  electrical: ["bodyParts"],
  consumable: ["consumables"],
  donorCar: ["models", "brands"],
  unknown: [],
};

/** Where each record type is persisted. */
export const RECORD_TYPE_TARGET: Record<RecordType, RecordTarget> = {
  engine: "motor",
  transmission: "inventory",
  transferCase: "inventory",
  reducer: "inventory",
  turbo: "inventory",
  body: "inventory",
  optics: "inventory",
  suspension: "inventory",
  electrical: "inventory",
  consumable: "inventory",
  donorCar: "vehicle",
  unknown: "inventory",
};

/** Russian labels for record types, shown across the wizard. */
export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  engine: "Двигатель",
  transmission: "КПП",
  transferCase: "Раздатка",
  reducer: "Редуктор",
  turbo: "Турбина",
  body: "Кузовщина",
  optics: "Оптика",
  suspension: "Подвеска",
  electrical: "Электрика",
  consumable: "Расходники",
  donorCar: "Автомобиль-донор",
  unknown: "Не определено",
};
