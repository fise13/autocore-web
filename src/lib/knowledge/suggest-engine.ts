import type {
  KnowledgePattern,
  KnowledgeScope,
  KnowledgeSuggestContext,
  KnowledgeSuggestion,
} from "@/domain/knowledge/types";
import { scorePattern } from "@/lib/knowledge/confidence";
import { buildExplanation } from "@/lib/knowledge/explanation";
import { normalizeKey } from "@/lib/knowledge/normalize";

function ageInDays(lastSeenAt: Date): number {
  return Math.max(0, (Date.now() - lastSeenAt.getTime()) / (24 * 60 * 60 * 1000));
}

function confidenceOf(pattern: KnowledgePattern): number {
  if (typeof pattern.confidence === "number" && pattern.confidence > 0) return pattern.confidence;
  return scorePattern({
    support: pattern.support,
    total: pattern.total,
    ageDays: ageInDays(pattern.lastSeenAt),
  });
}

/** Resolve which scope (if any) this pattern occupies for the given viewer/context. */
function resolveEffectiveScope(pattern: KnowledgePattern, context: KnowledgeSuggestContext): KnowledgeScope | null {
  switch (pattern.scope) {
    case "company":
      return "company";
    case "personal":
      return pattern.scopeId && pattern.scopeId === context.actorUserId ? "personal" : null;
    case "client":
      return pattern.scopeId && pattern.scopeId === context.clientId ? "client" : null;
    case "mechanic":
      return pattern.scopeId && pattern.scopeId === context.mechanicId ? "mechanic" : null;
    default:
      return null;
  }
}

/** Best-effort contextual relevance filter per pattern kind — skip if we know it can't apply. */
function isContextuallyRelevant(pattern: KnowledgePattern, context: KnowledgeSuggestContext): boolean {
  const engineCode = context.engineCode ? normalizeKey(context.engineCode) : undefined;

  switch (pattern.kind) {
    case "kit":
    case "mechanic":
      if (!engineCode) return true;
      return normalizeKey(pattern.keys[0] ?? "") === engineCode;
    case "field": {
      if (!context.fieldKey) return true;
      const patternFieldKey = pattern.metadata?.fieldKey;
      if (typeof patternFieldKey === "string") return normalizeKey(patternFieldKey) === normalizeKey(context.fieldKey);
      return normalizeKey(pattern.keys[0] ?? "") === normalizeKey(context.fieldKey);
    }
    case "search_boost":
      if (!context.query) return true;
      return normalizeKey(pattern.keys[0] ?? "") === normalizeKey(context.query);
    case "docpack": {
      const patternEngineCode = pattern.metadata?.engineCode;
      if (!engineCode || typeof patternEngineCode !== "string") return true;
      return normalizeKey(patternEngineCode) === engineCode;
    }
    default:
      return true;
  }
}

function subjectKeyFor(pattern: KnowledgePattern): string {
  switch (pattern.kind) {
    case "kit":
    case "mechanic":
      return pattern.label ?? pattern.keys[1] ?? pattern.keys[0] ?? "";
    case "cooccur":
    case "fbt":
    case "stock_codeplete":
      return pattern.label ?? pattern.keys.join(" + ");
    case "client_prefs":
      return pattern.label ?? pattern.keys[0] ?? "";
    case "field":
      return pattern.label ?? pattern.keys[pattern.keys.length - 1] ?? "";
    case "docpack":
      return pattern.label ?? pattern.keys.slice(-2).join(" + ");
    case "import_rule":
    case "ocr_confirm":
      return pattern.label ?? pattern.keys[1] ?? pattern.keys[0] ?? "";
    case "search_boost":
      return pattern.label ?? pattern.keys[1] ?? pattern.keys[0] ?? "";
    default:
      return pattern.label ?? pattern.keys.join(" ");
  }
}

const TITLE_BY_KIND: Record<KnowledgePattern["kind"], string> = {
  field: "Автозаполнение",
  kit: "Часто нужна вместе",
  cooccur: "Обычно берут вместе",
  fbt: "Клиенты также покупают",
  client_prefs: "Предпочтение клиента",
  mechanic: "Обычно у этого механика",
  docpack: "Часто печатают вместе",
  import_rule: "Правило импорта",
  ocr_confirm: "Распознавание OCR",
  search_boost: "Популярный результат",
  stock_codeplete: "Заканчивается вместе",
};

function buildPayload(pattern: KnowledgePattern): Record<string, unknown> {
  return {
    keys: pattern.keys,
    label: pattern.label,
    ...(pattern.metadata ?? {}),
  };
}

/**
 * Turn stored patterns into ranked-ready suggestions for a given viewer
 * context. Call `rankSuggestions` on the result to get the final ordering.
 */
export function buildSuggestionsFromPatterns(
  patterns: KnowledgePattern[],
  context: KnowledgeSuggestContext,
): KnowledgeSuggestion[] {
  const suggestions: KnowledgeSuggestion[] = [];

  for (const pattern of patterns) {
    const scope = resolveEffectiveScope(pattern, context);
    if (!scope) continue;
    if (!isContextuallyRelevant(pattern, context)) continue;

    const confidence = confidenceOf(pattern);
    if (confidence <= 0) continue;

    const subjectKey = subjectKeyFor(pattern);
    suggestions.push({
      id: `${pattern.id}::${scope}`,
      kind: pattern.kind,
      scope,
      patternId: pattern.id,
      title: subjectKey || TITLE_BY_KIND[pattern.kind] || "Рекомендация",
      explanation: buildExplanation({
        kind: pattern.kind,
        key: subjectKey,
        rate: pattern.total > 0 ? pattern.support / pattern.total : 0,
        support: pattern.support,
        windowDays: pattern.windowDays,
      }),
      confidence,
      support: pattern.support,
      total: pattern.total,
      payload: buildPayload(pattern),
    });
  }

  return suggestions;
}
