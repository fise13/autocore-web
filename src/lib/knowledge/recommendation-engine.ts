import type { KnowledgePattern, KnowledgeSuggestContext, KnowledgeSuggestion } from "@/domain/knowledge/types";
import { normalizeKey } from "@/lib/knowledge/normalize";
import { rankSuggestions } from "@/lib/knowledge/ranking";
import { buildSuggestionsFromPatterns } from "@/lib/knowledge/suggest-engine";

export type KitRecommendation = {
  engineCode: string;
  items: KnowledgeSuggestion[];
  confidence: number;
};

/** Bundle every "kit" pattern (parts + labor) known for `context.engineCode` into one recommendation. */
export function buildKitRecommendation(
  patterns: KnowledgePattern[],
  context: KnowledgeSuggestContext,
): KitRecommendation | null {
  if (!context.engineCode) return null;

  const kitPatterns = patterns.filter((pattern) => pattern.kind === "kit");
  const items = rankSuggestions(buildSuggestionsFromPatterns(kitPatterns, context), {
    ...context,
    limit: context.limit ?? 20,
  });
  if (items.length === 0) return null;

  const confidence = items.reduce((max, item) => Math.max(max, item.confidence), 0);
  return { engineCode: context.engineCode, items, confidence };
}

/**
 * Given the items already in a basket/work order, surface what else tends to
 * go with them (`fbt` from real sales, `cooccur` from work order history).
 */
export function buildFbtRecommendations(
  patterns: KnowledgePattern[],
  selectedSkus: string[],
  context: KnowledgeSuggestContext = { companyId: "" },
): KnowledgeSuggestion[] {
  const selected = new Set(selectedSkus.map((sku) => normalizeKey(sku)));
  if (selected.size === 0) return [];

  const relevant = patterns.filter(
    (pattern) =>
      (pattern.kind === "fbt" || pattern.kind === "cooccur") &&
      pattern.keys.some((key) => selected.has(normalizeKey(key))),
  );

  const candidates = buildSuggestionsFromPatterns(relevant, context).filter((suggestion) => {
    const keys = Array.isArray(suggestion.payload.keys) ? (suggestion.payload.keys as unknown[]) : [];
    return keys.some((key) => typeof key === "string" && !selected.has(normalizeKey(key)));
  });

  return rankSuggestions(candidates, context);
}

/** Best-known bundle of document types to print together for this work order/engine. */
export function buildDocPackRecommendation(
  patterns: KnowledgePattern[],
  context: KnowledgeSuggestContext,
): KnowledgeSuggestion | null {
  const docPatterns = patterns.filter((pattern) => pattern.kind === "docpack");
  const [best] = rankSuggestions(buildSuggestionsFromPatterns(docPatterns, context), { ...context, limit: 1 });
  return best ?? null;
}
