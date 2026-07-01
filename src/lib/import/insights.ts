/**
 * Explainable insights for the migration UI.
 *
 * The engine already produces a confidence score and structured issues; this
 * module turns those into human, trustworthy explanations ("why 97%?") and
 * inline record-type suggestions for rows the dictionary could not resolve.
 *
 * Pure and reusable — the same explanations drive the web review grid today and
 * a mobile review screen or an AI agent's rationale later.
 */

import { fold } from "@/lib/domain/normalize";
import { searchDomain } from "@/lib/domain/domain-dictionary";
import type { DomainDictionary } from "@/lib/domain/domain-dictionary";
import type { DomainCategory } from "@/lib/domain/types";

import { fromDictionaryScore } from "./confidence";
import {
  RECORD_TYPE_LABELS,
  RECORD_TYPE_TARGET,
  type ClassifiedRow,
  type RecordType,
} from "./types";
import type { ClassifyOptions } from "./record-classifier";

export type ReasonTone = "positive" | "warning";

export type RowReason = {
  tone: ReasonTone;
  label: string;
};

export type RowExplanation = {
  percent: number;
  tier: ClassifiedRow["confidence"]["tier"];
  reasons: RowReason[];
};

/**
 * Build the bullet list shown under a row's confidence percentage. Positive
 * reasons say what AutoCore understood; warnings say what needs attention.
 */
export function explainRow(row: ClassifiedRow): RowExplanation {
  const reasons: RowReason[] = [];
  const { classification, values, fieldConfidence } = row;

  // Positive signals.
  if (classification.confidence.source === "dictionary") {
    reasons.push({
      tone: "positive",
      label: classification.matchedEntry
        ? `Совпадение со словарём: ${classification.matchedEntry.name}`
        : "Совпадение со словарём AutoCore",
    });
  }
  if (classification.recordType !== "unknown") {
    reasons.push({
      tone: "positive",
      label: `Тип определён: ${RECORD_TYPE_LABELS[classification.recordType]}`,
    });
  }
  const headerMatched = Object.values(fieldConfidence).some((c) => c.tier === "high");
  if (headerMatched) {
    reasons.push({ tone: "positive", label: "Колонки распознаны" });
  }
  if (values.serial) reasons.push({ tone: "positive", label: "Серийный номер найден" });
  if (values.vin) reasons.push({ tone: "positive", label: "VIN найден" });

  // Warnings, derived from the row's issues.
  for (const issue of row.issues) {
    switch (issue.kind) {
      case "missing-required":
        reasons.push({ tone: "warning", label: issue.message });
        break;
      case "unknown-type":
        reasons.push({ tone: "warning", label: "Категория не определена" });
        break;
      case "duplicate":
        reasons.push({ tone: "warning", label: issue.message });
        break;
      case "invalid-value":
        reasons.push({ tone: "warning", label: issue.message });
        break;
      case "low-confidence":
        // Captured by the percent itself; only add if nothing else explains it.
        if (reasons.length === 0) reasons.push({ tone: "warning", label: "Низкая уверенность" });
        break;
    }
  }

  if (classification.confidence.source === "ai") {
    reasons.push({ tone: "warning", label: "Использован ИИ AutoCore" });
  }

  return {
    percent: Math.round(row.confidence.score * 100),
    tier: row.confidence.tier,
    reasons,
  };
}

export type RecordSuggestion = {
  recordType: RecordType;
  label: string;
  /** Canonical value the suggestion would write (entry name or record label). */
  value: string;
  /** 0–1. */
  confidence: number;
  target: ClassifiedRow["classification"]["target"];
};

/** Categories worth searching for inline suggestions, with their record type. */
const SUGGEST_DOMAINS: Array<{ category: DomainCategory; type: RecordType }> = [
  { category: "engines", type: "engine" },
  { category: "transmissions", type: "transmission" },
  { category: "bodyParts", type: "body" },
  { category: "consumables", type: "consumable" },
];

/**
 * Inline AI/dictionary suggestions for a row ("морда BL5" → Front Clip 87% …).
 * Dictionary results first; callers may append AI results on top.
 */
export function suggestRecordTypes(
  row: ClassifiedRow,
  options: ClassifyOptions & { limit?: number } = {},
): RecordSuggestion[] {
  const query = [row.values.name, row.values.category, row.values.comment]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!query) return [];

  const seen = new Set<string>();
  const suggestions: RecordSuggestion[] = [];

  for (const { category, type } of SUGGEST_DOMAINS) {
    const companyDict: DomainDictionary | null = options.getCompanyDictionary?.(category) ?? null;
    const results = searchDomain(category, query, companyDict, { limit: 2 });
    for (const result of results) {
      const key = `${type}:${fold(result.entry.name)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        recordType: type,
        label: RECORD_TYPE_LABELS[type],
        value: result.entry.name,
        confidence: fromDictionaryScore(result.score),
        target: RECORD_TYPE_TARGET[type],
      });
    }
  }

  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, options.limit ?? 3);
}
