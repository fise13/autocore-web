/**
 * Automatic column detection.
 *
 * Detection blends two independent signals:
 *  1. Header match — the column title vs. the field alias catalog.
 *  2. Value match — the column's sample cells vs. the field's value detector.
 *
 * A column whose header says "номер" but whose values are all 17-char VINs is
 * still mapped to VIN. Assignment is global and 1:1 — each field claims at most
 * one column, each column maps to at most one field — resolved greedily by score.
 */

import { FIELD_SIGNATURE_BY_FIELD, matchHeaderToFields } from "./canonical-fields";
import { makeConfidence } from "./confidence";
import type {
  CanonicalField,
  ColumnMapping,
  Confidence,
  DetectedColumn,
  ParsedTable,
} from "./types";

const SAMPLE_SIZE = 25;
/** Below this combined score we treat a column as unmapped. */
const ASSIGN_THRESHOLD = 0.45;

type Candidate = { column: number; field: CanonicalField; score: number; valueFit: number };

function sampleColumn(table: ParsedTable, header: string): string[] {
  const samples: string[] = [];
  for (const row of table.rows) {
    const value = (row[header] ?? "").trim();
    if (value) samples.push(value);
    if (samples.length >= SAMPLE_SIZE) break;
  }
  return samples;
}

/**
 * Confidence that a column's values belong to a field (0–1): the fraction of
 * samples the detector accepts, scaled by how conclusive that detector is.
 */
function valueScore(field: CanonicalField, samples: string[]): number {
  const signature = FIELD_SIGNATURE_BY_FIELD[field];
  const detector = signature?.valueDetector;
  if (!detector || samples.length === 0) return 0;
  let hits = 0;
  for (const sample of samples) {
    if (detector(sample)) hits += 1;
  }
  const fraction = hits / samples.length;
  return fraction * (signature.valueWeight ?? 0.5);
}

function reasonForColumn(
  header: string,
  field: CanonicalField | null,
  headerScore: number,
  valueFit: number,
): string {
  if (!field) return "Колонка не распознана";
  const label = FIELD_SIGNATURE_BY_FIELD[field]?.label ?? field;
  if (headerScore >= 0.9) return `Заголовок «${header}» → ${label}`;
  if (valueFit >= 0.6) return `Значения колонки похожи на «${label}»`;
  if (headerScore > 0) return `Заголовок частично совпал с «${label}»`;
  return `Сопоставлено с «${label}»`;
}

export function detectColumns(table: ParsedTable): ColumnMapping {
  const headers = table.headers;
  const perColumn = headers.map((header) => {
    const samples = sampleColumn(table, header);
    const headerMatches = matchHeaderToFields(header);
    const headerByField = new Map(headerMatches.map((m) => [m.field, m.score]));

    // Union of fields suggested by header OR by value detectors.
    const fieldScores = new Map<CanonicalField, { headerScore: number; valueFit: number }>();
    for (const match of headerMatches) {
      fieldScores.set(match.field, { headerScore: match.score, valueFit: 0 });
    }
    for (const signature of Object.values(FIELD_SIGNATURE_BY_FIELD)) {
      if (!signature.valueDetector) continue;
      const fit = valueScore(signature.field, samples);
      if (fit <= 0) continue;
      const current = fieldScores.get(signature.field) ?? {
        headerScore: headerByField.get(signature.field) ?? 0,
        valueFit: 0,
      };
      current.valueFit = fit;
      fieldScores.set(signature.field, current);
    }

    const scored = [...fieldScores.entries()]
      .map(([field, { headerScore, valueFit }]) => {
        // Either a confident header OR confident values is enough; agreement
        // between the two adds a small bonus.
        const base = Math.max(headerScore, valueFit);
        const agreement = headerScore > 0 && valueFit > 0 ? Math.min(headerScore, valueFit) * 0.1 : 0;
        const combined = Math.min(1, base + agreement);
        return { field, score: combined, headerScore, valueFit };
      })
      .sort((a, b) => b.score - a.score || b.valueFit - a.valueFit);

    return { header, samples, scored };
  });

  // Build global candidate list and resolve 1:1 greedily.
  const candidates: Candidate[] = [];
  perColumn.forEach((entry, column) => {
    for (const option of entry.scored) {
      if (option.score >= ASSIGN_THRESHOLD) {
        candidates.push({ column, field: option.field, score: option.score, valueFit: option.valueFit });
      }
    }
  });
  // Higher score wins; ties go to the value-backed candidate (e.g. a real VIN
  // column beats a generic "номер" header competing for the same column).
  candidates.sort((a, b) => b.score - a.score || b.valueFit - a.valueFit);

  const columnToField = new Map<number, CanonicalField>();
  const usedFields = new Set<CanonicalField>();
  for (const candidate of candidates) {
    if (columnToField.has(candidate.column) || usedFields.has(candidate.field)) continue;
    columnToField.set(candidate.column, candidate.field);
    usedFields.add(candidate.field);
  }

  const columns: DetectedColumn[] = perColumn.map((entry, column) => {
    const field = columnToField.get(column) ?? null;
    const chosen = entry.scored.find((option) => option.field === field) ?? null;
    const headerScore = chosen?.headerScore ?? 0;
    const valueFit = chosen?.valueFit ?? 0;
    const score = chosen?.score ?? 0;

    const confidence: Confidence = makeConfidence(
      field ? score : 0,
      reasonForColumn(entry.header, field, headerScore, valueFit),
      valueFit > headerScore ? "rules" : "dictionary",
    );

    const alternatives = entry.scored
      .filter((option) => option.field !== field)
      .slice(0, 3)
      .map((option) => ({ field: option.field, score: option.score }));

    return { header: entry.header, field, confidence, alternatives };
  });

  const fields: Partial<Record<CanonicalField, string>> = {};
  columns.forEach((col) => {
    if (col.field) fields[col.field] = col.header;
  });

  const hasName = Boolean(fields.name || fields.serial || fields.sku);
  const lowConfidenceCount = columns.filter(
    (col) => col.field && col.confidence.tier === "low",
  ).length;
  const needsAi = !hasName || lowConfidenceCount > Math.max(2, columns.length / 2);

  return { fields, columns, needsAi };
}
