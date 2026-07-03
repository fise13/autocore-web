import type { ScanLearningExample } from "./scan-learning.server";
import type { MobileScanCandidate } from "./scan-types";

export const SCAN_AI_UNCERTAIN_THRESHOLD = 0.45;

export function buildScanOcrSystemPrompt(): string {
  return [
    "You extract machine-readable codes from automotive parts packaging photos.",
    "Return JSON only.",
    "Prioritize EAN-13, Code128, OEM part numbers, and internal SKU labels.",
    "Ignore decorative text, prices, and marketing slogans.",
    "If unsure, lower confidence and add warnings.",
  ].join(" ");
}

export function buildScanDisambiguateSystemPrompt(examples: ScanLearningExample[]): string {
  const exampleBlock =
    examples.length > 0
      ? examples
          .map(
            (example) =>
              `- code "${example.payload}" → item "${example.itemName}" (sku ${example.itemSku}, id ${example.itemId})`,
          )
          .join("\n")
      : "No confirmed examples yet.";

  return [
    "You match a scanned warehouse code to the best inventory item for an auto-parts company.",
    "Choose itemId from candidates only, or null if none fit.",
    "Confirmed examples for this company:",
    exampleBlock,
    "Return JSON only with itemId, confidence 0..1, reasoning, warnings.",
  ].join("\n");
}

export function buildScanDisambiguateUserPrompt(
  payload: string,
  candidates: MobileScanCandidate[],
): string {
  const candidateLines = candidates
    .map(
      (candidate, index) =>
        `${index + 1}. id=${candidate.item.id} sku=${candidate.item.sku} name=${candidate.item.name} brand=${candidate.item.brandName ?? ""} barcodes=${(candidate.item.barcodes ?? []).join(",")} score=${candidate.score.toFixed(2)} reason=${candidate.reason}`,
    )
    .join("\n");

  return `Scanned code: "${payload}"\nCandidates:\n${candidateLines}`;
}
