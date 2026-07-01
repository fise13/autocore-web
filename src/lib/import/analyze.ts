/**
 * Import analysis orchestrator.
 *
 * `analyzeTable` is the single entry point the rest of AutoCore calls: feed it a
 * cleaned {@link ParsedTable} and it returns column mapping, per-row record-type
 * classification, per-field + per-row confidence, issues, and summary stats.
 *
 * It is pure and synchronous — no React, no Firestore, no network — so it runs
 * identically in the browser, in a Web Worker, on the server, and (later) on
 * mobile. AI is never called here; rows that need it are flagged via `needsAi`.
 */

import { detectColumns } from "./column-detector";
import { FIELD_SIGNATURE_BY_FIELD } from "./canonical-fields";
import { combineConfidence, makeConfidence } from "./confidence";
import {
  buildMotorInventoryMapping,
  classifyMotorInventoryRecord,
  detectMotorInventoryContext,
  enrichMotorInventoryValues,
  motorInventoryRequiredFields,
  type MotorInventoryContext,
} from "./motor-inventory-profile";
import { classifyRecord, type ClassifyOptions } from "./record-classifier";
import {
  classifyStructuredCatalogRecord,
  detectStructuredCatalogContext,
  enrichStructuredCatalogValues,
  structuredCatalogRequiredFields,
  type StructuredCatalogContext,
} from "./structured-catalog-profile";
import {
  RECORD_TYPES,
  type CanonicalField,
  type ClassifiedRow,
  type ColumnMapping,
  type Confidence,
  type ImportAnalysis,
  type ImportAnalysisStats,
  type ParsedTable,
  type RecordType,
  type RowIssue,
} from "./types";
import { detectCurrency, parseNumericValue, parseYear } from "./value-detectors";

export type AnalyzeOptions = ClassifyOptions & {
  /** Existing serials/SKUs/VINs/names to flag duplicates against. */
  existingKeys?: {
    serials?: Set<string>;
    skus?: Set<string>;
    vins?: Set<string>;
    names?: Set<string>;
  };
  /** Injected by analyzeTable when a motor catalog profile is detected. */
  motorContext?: MotorInventoryContext | null;
  /** Injected when a supplier «Тип» column layout is detected. */
  structuredContext?: StructuredCatalogContext | null;
};

const REQUIRED_FOR_RECORD: Record<RecordType, CanonicalField[]> = {
  engine: ["name"],
  transmission: ["name"],
  transferCase: ["name"],
  reducer: ["name"],
  turbo: ["name"],
  body: ["name"],
  optics: ["name"],
  suspension: ["name"],
  electrical: ["name"],
  consumable: ["name"],
  donorCar: ["brand"],
  unknown: ["name"],
};

function extractValues(
  row: Record<string, string>,
  mapping: ColumnMapping,
): Partial<Record<CanonicalField, string>> {
  const values: Partial<Record<CanonicalField, string>> = {};
  for (const [field, header] of Object.entries(mapping.fields) as Array<[CanonicalField, string]>) {
    const value = (row[header] ?? "").trim();
    if (value) values[field] = value;
  }
  // Derive currency from the price cell when there is no dedicated column.
  if (!values.currency && values.price) {
    const currency = detectCurrency(values.price);
    if (currency) values.currency = currency;
  }
  return values;
}

/** Validate an individual extracted value; null = ok, string = problem. */
function validateField(field: CanonicalField, value: string): string | null {
  switch (field) {
    case "year":
      return parseYear(value) === null ? "Некорректный год" : null;
    case "price":
      return parseNumericValue(value) === null ? "Цена не распознана" : null;
    case "quantity":
      return parseNumericValue(value) === null ? "Количество не распознано" : null;
    default:
      return null;
  }
}

function dedupeKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildRow(
  index: number,
  raw: Record<string, string>,
  mapping: ColumnMapping,
  options: AnalyzeOptions,
): ClassifiedRow {
  let values = extractValues(raw, mapping);
  const motorContext = options.motorContext ?? null;
  const structuredContext = options.structuredContext ?? null;
  if (motorContext) {
    values = enrichMotorInventoryValues(values, raw, motorContext);
  } else if (structuredContext) {
    values = enrichStructuredCatalogValues(values);
  }

  const motorClassification = motorContext
    ? classifyMotorInventoryRecord(values, motorContext)
    : null;
  const structuredClassification = structuredContext
    ? classifyStructuredCatalogRecord(values)
    : null;
  const classification =
    motorClassification ?? structuredClassification ?? classifyRecord(values, options);

  const fieldConfidence: Partial<Record<CanonicalField, Confidence>> = {};
  const issues: RowIssue[] = [];

  // Field-level confidence inherits the column detection confidence, then
  // gets penalised by value validation failures.
  for (const column of mapping.columns) {
    if (!column.field) continue;
    const value = values[column.field];
    if (value === undefined) continue;
    const problem = validateField(column.field, value);
    if (problem) {
      fieldConfidence[column.field] = makeConfidence(0.4, problem, "rules");
      issues.push({ kind: "invalid-value", field: column.field, message: problem });
    } else {
      fieldConfidence[column.field] = column.confidence;
    }
  }

  // Required-field check for the detected record type.
  const required = motorContext
    ? motorInventoryRequiredFields(motorContext, values)
    : structuredContext
      ? structuredCatalogRequiredFields(values)
      : (REQUIRED_FOR_RECORD[classification.recordType] ?? ["name"]);
  for (const field of required) {
    if (!values[field]) {
      const label = FIELD_SIGNATURE_BY_FIELD[field]?.label ?? field;
      issues.push({
        kind: "missing-required",
        field,
        message: `Не заполнено поле «${label}»`,
      });
    }
  }

  // Duplicate detection against existing data.
  const existing = options.existingKeys;
  if (existing) {
    if (values.serial && existing.serials?.has(dedupeKey(values.serial))) {
      issues.push({ kind: "duplicate", field: "serial", message: "Серийный номер уже есть в базе" });
    } else if (values.vin && existing.vins?.has(dedupeKey(values.vin))) {
      issues.push({ kind: "duplicate", field: "vin", message: "VIN уже есть в базе" });
    } else if (values.sku && existing.skus?.has(dedupeKey(values.sku))) {
      issues.push({ kind: "duplicate", field: "sku", message: "Артикул уже есть в базе" });
    } else if (values.name && existing.names?.has(dedupeKey(values.name))) {
      issues.push({ kind: "duplicate", field: "name", message: "Похожее название уже есть в базе" });
    }
  }

  if (classification.recordType === "unknown") {
    issues.push({ kind: "unknown-type", message: "Тип записи не определён" });
  }

  // Overall row confidence = weakest of classification + mapped fields.
  const overall = combineConfidence(
    [classification.confidence, ...Object.values(fieldConfidence)],
    "Строка требует проверки",
  );
  if (overall.tier === "low") {
    issues.push({ kind: "low-confidence", message: overall.reason });
  }

  const needsAi =
    classification.recordType === "unknown" || classification.confidence.score < 0.6;

  return {
    index,
    raw,
    values,
    classification,
    confidence: overall,
    fieldConfidence,
    issues,
    needsAi,
  };
}

function computeStats(rows: ClassifiedRow[]): ImportAnalysisStats {
  let recognized = 0;
  let needsReview = 0;
  let errors = 0;
  let duplicates = 0;
  let missingFields = 0;

  for (const row of rows) {
    if (row.confidence.tier === "high") recognized += 1;
    else if (row.confidence.tier === "medium") needsReview += 1;
    else errors += 1;

    if (row.issues.some((issue) => issue.kind === "duplicate")) duplicates += 1;
    if (row.issues.some((issue) => issue.kind === "missing-required")) missingFields += 1;
  }

  return { total: rows.length, recognized, needsReview, errors, duplicates, missingFields };
}

function dominantType(rows: ClassifiedRow[]): RecordType {
  const counts = new Map<RecordType, number>();
  for (const row of rows) {
    const type = row.classification.recordType;
    if (type === "unknown") continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  let best: RecordType = "unknown";
  let bestCount = 0;
  for (const type of RECORD_TYPES) {
    const count = counts.get(type) ?? 0;
    if (count > bestCount) {
      best = type;
      bestCount = count;
    }
  }
  return best;
}

export function analyzeTable(table: ParsedTable, options: AnalyzeOptions = {}): ImportAnalysis {
  const motorContext = detectMotorInventoryContext(table);
  const structuredContext = motorContext ? null : detectStructuredCatalogContext(table);
  const mapping = motorContext ? buildMotorInventoryMapping(table, motorContext) : detectColumns(table);
  const rowOptions: AnalyzeOptions = { ...options, motorContext, structuredContext };
  const rows = table.rows.map((raw, index) => buildRow(index, raw, mapping, rowOptions));
  return {
    table,
    mapping,
    rows,
    stats: computeStats(rows),
    dominantRecordType: dominantType(rows),
  };
}
