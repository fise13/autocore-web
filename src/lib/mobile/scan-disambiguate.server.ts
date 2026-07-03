import "server-only";

import {
  SCAN_AI_UNCERTAIN_THRESHOLD,
  buildScanDisambiguateSystemPrompt,
  buildScanDisambiguateUserPrompt,
} from "./scan-ai-prompts";
import { runScanDisambiguate } from "./scan-ai-client.server";
import { loadScanFewShotExamples } from "./scan-learning.server";
import {
  resolveMobileScan,
  resolveMobileScanForItemId,
  type MobileScanResolveResult,
} from "./scan-resolve.server";

export async function disambiguateMobileScan(
  companyId: string,
  rawBarcode: string,
): Promise<MobileScanResolveResult> {
  const base = await resolveMobileScan(companyId, rawBarcode, { skipFuzzy: false });
  if (base.found) return base;

  const candidates = base.candidates;
  if (candidates.length === 0) {
    return base;
  }

  const examples = await loadScanFewShotExamples(companyId, 5);
  const systemPrompt = buildScanDisambiguateSystemPrompt(examples);
  const userPrompt = buildScanDisambiguateUserPrompt(base.barcode, candidates);

  try {
    const ai = await runScanDisambiguate(systemPrompt, userPrompt);
    if (!ai.itemId || ai.confidence < SCAN_AI_UNCERTAIN_THRESHOLD) {
      return {
        ...base,
        aiReasoning: ai.reasoning,
        matchType: "ai",
      };
    }

    const allowed = candidates.some((candidate) => candidate.item.id === ai.itemId);
    if (!allowed) {
      return {
        ...base,
        aiReasoning: `${ai.reasoning} (item not in candidates)`,
        matchType: "ai",
      };
    }

    const resolved = await resolveMobileScanForItemId(
      companyId,
      rawBarcode,
      ai.itemId,
      "ai",
      ai.confidence,
    );
    return {
      ...resolved,
      candidates,
      aiReasoning: ai.reasoning,
    };
  } catch (error) {
    console.warn("[scan/disambiguate]", error);
    return base;
  }
}
