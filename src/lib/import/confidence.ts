/**
 * Unified confidence model.
 *
 * Every signal in the import pipeline (dictionary scores 0–1000, AI 0–1, rule
 * heuristics) is funnelled through here so the whole product speaks one 0–1
 * language with consistent tiers and colours.
 */

import type { Confidence, ConfidenceTier, ImportValueSource } from "./types";

/** Tier thresholds, matching the spec: 🟢 90–100 / 🟡 60–89 / 🔴 <60. */
export const CONFIDENCE_THRESHOLDS = {
  high: 0.9,
  medium: 0.6,
} as const;

export function tierForScore(score: number): ConfidenceTier {
  if (score >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
}

const clamp01 = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

/**
 * Convert a raw Domain Dictionary score (~240–1000) to 0–1.
 * Exact (1000) → 1.0, prefix (~880) → ~0.88, typo floor (~240) → ~0.24.
 */
export function fromDictionaryScore(score: number): number {
  return clamp01(score / 1000);
}

export function makeConfidence(
  score: number,
  reason: string,
  source: ImportValueSource,
): Confidence {
  const clamped = clamp01(score);
  return { score: clamped, tier: tierForScore(clamped), reason, source };
}

/** Combine multiple readings into the weakest-link overall confidence. */
export function combineConfidence(
  parts: Confidence[],
  fallbackReason = "Недостаточно данных",
): Confidence {
  if (parts.length === 0) {
    return makeConfidence(0, fallbackReason, "rules");
  }
  const weakest = parts.reduce((min, part) => (part.score < min.score ? part : min), parts[0]);
  return weakest;
}

/** Hex/Tailwind-agnostic semantic colour token for a tier. */
export function tierColorToken(tier: ConfidenceTier): "emerald" | "amber" | "rose" {
  if (tier === "high") return "emerald";
  if (tier === "medium") return "amber";
  return "rose";
}

/** Render a percentage label (e.g. "98%") for the UI. */
export function confidencePercent(confidence: Confidence): string {
  return `${Math.round(confidence.score * 100)}%`;
}
