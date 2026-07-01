/**
 * AI fallback application.
 *
 * The core engine flags rows it could not resolve (`needsAi`). This helper takes
 * those rows, asks an injected {@link ImportAiPort} to classify them, and merges
 * the answers back — but only when AI is more confident than the dictionary was.
 * Domain Dictionary always wins ties; AI is strictly a last resort.
 */

import { makeConfidence } from "./confidence";
import {
  RECORD_TYPE_TARGET,
  type ClassifiedRow,
  type ImportAiPort,
} from "./types";

export type ApplyAiOptions = {
  companyId?: string;
  /** Skip AI entirely (offline, no quota). */
  disabled?: boolean;
};

/** Build the compact text sample the AI sees for a row. */
function rowSample(row: ClassifiedRow): string {
  return [
    row.values.name,
    row.values.category,
    row.values.subcategory,
    row.values.brand,
    row.values.model,
    row.values.comment,
  ]
    .filter(Boolean)
    .join(" | ");
}

export async function applyAiFallback(
  rows: ClassifiedRow[],
  port: ImportAiPort | null | undefined,
  options: ApplyAiOptions = {},
): Promise<ClassifiedRow[]> {
  if (!port?.classifyRows || options.disabled) return rows;

  const targets = rows.filter((row) => row.needsAi);
  if (targets.length === 0) return rows;

  let results;
  try {
    results = await port.classifyRows({
      companyId: options.companyId,
      rows: targets.map((row) => ({ index: row.index, sample: rowSample(row) })),
    });
  } catch {
    // AI is best-effort: never fail the import because the model is unavailable.
    return rows;
  }

  const byIndex = new Map(results.map((result) => [result.index, result]));
  return rows.map((row) => {
    const ai = byIndex.get(row.index);
    if (!ai || ai.recordType === "unknown") return row;
    // Only override when AI beats the existing (weak) signal.
    if (ai.confidence <= row.classification.confidence.score) return row;

    const values = { ...row.values };
    if (ai.brand && !values.brand) values.brand = ai.brand;
    if (ai.model && !values.model) values.model = ai.model;

    return {
      ...row,
      values,
      classification: {
        recordType: ai.recordType,
        target: RECORD_TYPE_TARGET[ai.recordType],
        confidence: makeConfidence(
          ai.confidence,
          "Определено ИИ AutoCore (словарь не дал ответа)",
          "ai",
        ),
      },
      needsAi: false,
      issues: row.issues.filter((issue) => issue.kind !== "unknown-type"),
    };
  });
}
