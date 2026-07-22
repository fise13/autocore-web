import type { KnowledgePatternKind, KnowledgeScope } from "@/domain/knowledge/types";
import { normalizeKey } from "@/lib/knowledge/normalize";

/**
 * Deterministic Firestore document id for a pattern: same kind + same
 * (normalized, order-preserved) keys always upsert the same doc, so counts
 * accumulate instead of forking into duplicates.
 */
export function buildPatternId(kind: KnowledgePatternKind, keys: string[]): string {
  const normalized = keys.map((key) => normalizeKey(key)).filter((key) => key.length > 0);
  const suffix = normalized.length > 0 ? normalized.join("__") : "none";
  return `${kind}::${suffix}`;
}

/** Scope a pattern id by owner so personal/client/mechanic patterns don't collide with company ones. */
export function buildScopedPatternId(
  kind: KnowledgePatternKind,
  scope: KnowledgeScope,
  scopeId: string | undefined,
  keys: string[],
): string {
  const base = buildPatternId(kind, keys);
  if (scope === "company" || !scopeId) return base;
  return `${base}::${scope}:${normalizeKey(scopeId)}`;
}
