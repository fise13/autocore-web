import { resolveBrandDisplayName } from "@/lib/motors/import-normalization";
import { readEngineCode } from "@/lib/motors/import/engine-code-shorthand";

import { detectCurrency, parseNumericValue, parseYear } from "../value-detectors";
import type { CanonicalField } from "../types";
import { SUPPORTED_CURRENCIES } from "./ontology";

/**
 * Normalization, split by whether the answer is a fact or a judgement.
 *
 * Deterministic first, always. "SUBARU" → "Subaru", "2 015" → "2015",
 * "253AVCS" → "EJ253", "$" → "USD" — these have one right answer, and asking a
 * model for it would be slower, costlier and less repeatable. Whatever is left
 * over is the interesting half: "Camry XV50" and "Toyota Camry 2015" are the
 * same model written two ways, and no lookup table can tell you that.
 *
 * The rule the whole file is built around: the original is never destroyed.
 * Every value keeps `raw` beside `normalized`, because a normalization that
 * turns out wrong months later is only recoverable if the source text survived.
 *
 * Pure — the AI half is fed by the caller, which owns the network.
 */

export type NormalizationOutcome = {
  raw: string;
  normalized: string;
  confidence: number;
  reason: string;
  /** Whether a model was needed, or a rule settled it. */
  source: "rules" | "ai";
};

/** Fields worth normalizing at all. Free text is left exactly as written. */
export const NORMALIZABLE_FIELDS: CanonicalField[] = [
  "brand",
  "model",
  "year",
  "currency",
  "price",
  "quantity",
  "serial",
  "vin",
];

function outcome(
  raw: string,
  normalized: string,
  confidence: number,
  reason: string,
): NormalizationOutcome {
  return { raw, normalized, confidence, reason, source: "rules" };
}

/**
 * The deterministic pass. Returns null when the value needs judgement rather
 * than a rule — that is the queue the model gets.
 */
export function normalizeDeterministically(
  field: CanonicalField,
  raw: string,
): NormalizationOutcome | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  switch (field) {
    case "brand": {
      const resolved = resolveBrandDisplayName(trimmed).trim();
      if (!resolved) return null;
      // A model name in the brand column resolves to its manufacturer, which
      // is a real change worth reporting rather than a silent tidy-up.
      const changed = resolved.toLowerCase() !== trimmed.toLowerCase();
      return outcome(
        raw,
        resolved,
        changed ? 0.9 : 0.99,
        changed ? `«${trimmed}» — это ${resolved}` : "Каноничное написание марки",
      );
    }

    case "vin": {
      return outcome(raw, trimmed.toUpperCase(), 1, "VIN приводится к верхнему регистру");
    }

    case "serial": {
      const code = readEngineCode(trimmed);
      // A serial that leads with a known engine code keeps the whole string —
      // the unit number is the identity and must not be trimmed away.
      return outcome(
        raw,
        trimmed.toUpperCase(),
        code ? 0.95 : 0.85,
        "Серийный номер приводится к верхнему регистру",
      );
    }

    case "year": {
      const year = parseYear(trimmed);
      if (year === null) return null;
      return outcome(raw, String(year), 1, "Год распознан");
    }

    case "currency": {
      const upper = trimmed.toUpperCase();
      if ((SUPPORTED_CURRENCIES as readonly string[]).includes(upper)) {
        return outcome(raw, upper, 1, "Валюта распознана");
      }
      const detected = detectCurrency(trimmed);
      if (detected) return outcome(raw, detected, 0.9, "Валюта распознана по символу");
      return null;
    }

    case "price":
    case "quantity": {
      const parsed = parseNumericValue(trimmed);
      if (parsed === null) return null;
      return outcome(raw, String(parsed), 0.95, "Число распознано");
    }

    case "model":
      // Deliberately not handled: "Camry XV50" versus "Toyota Camry 2015" is a
      // judgement about generations, and getting it wrong merges two real
      // models. Left for the model, which sees the whole file's spellings.
      return null;

    default:
      return null;
  }
}

/** One value the deterministic pass could not settle. */
export type PendingNormalization = {
  valueId: string;
  field: CanonicalField;
  raw: string;
  /** Other spellings of the same field in this file, for context. */
  peers: string[];
};

/**
 * Collect what still needs judgement, with the peers that make it judgeable.
 *
 * Peers are the point: a model shown "Camry 50" alone can only guess, and one
 * shown it beside "Toyota Camry XV50 2015" from the same book can actually
 * decide. Capped so a file of five thousand distinct models does not become a
 * five-thousand-item prompt.
 */
export function collectPendingNormalizations(
  values: ReadonlyArray<{ valueId: string; field: CanonicalField; raw: string }>,
  peerLimit = 12,
): PendingNormalization[] {
  const byField = new Map<CanonicalField, Set<string>>();
  for (const value of values) {
    const bucket = byField.get(value.field) ?? new Set<string>();
    bucket.add(value.raw.trim());
    byField.set(value.field, bucket);
  }

  const pending: PendingNormalization[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const raw = value.raw.trim();
    if (!raw) continue;
    if (normalizeDeterministically(value.field, raw)) continue;
    // One question per distinct spelling — asking twice costs twice.
    const dedupeKey = `${value.field}:${raw.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const peers = [...(byField.get(value.field) ?? [])]
      .filter((peer) => peer && peer.toLowerCase() !== raw.toLowerCase())
      .slice(0, peerLimit);
    pending.push({ valueId: value.valueId, field: value.field, raw, peers });
  }
  return pending;
}

/**
 * Whether a proposed normalization may be applied without asking a person.
 *
 * Below the bar the raw value is kept and the proposal becomes a note. A
 * normalization is a rewrite of the customer's data; a confident-sounding
 * wrong one is worse than leaving the text alone.
 */
export const NORMALIZATION_APPLY_THRESHOLD = 0.75;

export function mayApplyNormalization(confidence: number): boolean {
  return Number.isFinite(confidence) && confidence >= NORMALIZATION_APPLY_THRESHOLD;
}
