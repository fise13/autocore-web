import type { KnowledgeScope, KnowledgeSuggestContext, KnowledgeSuggestion } from "@/domain/knowledge/types";

const SCOPE_PRIORITY: Record<KnowledgeScope, number> = {
  personal: 4,
  client: 3,
  mechanic: 2,
  company: 1,
};

const DEFAULT_LIMIT = 8;

/**
 * Order suggestions the way a mechanic would want them: what *this person*
 * always does first, then what *this client* usually wants, then what *this
 * mechanic* usually does, and finally the company-wide default. Ties within
 * a scope break on confidence, then on support (more observations wins).
 */
export function rankSuggestions(
  candidates: KnowledgeSuggestion[],
  context: KnowledgeSuggestContext = { companyId: "" },
): KnowledgeSuggestion[] {
  const limit = context.limit ?? DEFAULT_LIMIT;

  return [...candidates]
    .filter((candidate) => candidate.confidence > 0)
    .sort((a, b) => {
      const scopeDiff = SCOPE_PRIORITY[b.scope] - SCOPE_PRIORITY[a.scope];
      if (scopeDiff !== 0) return scopeDiff;
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.support - a.support;
    })
    .slice(0, Math.max(0, limit));
}
