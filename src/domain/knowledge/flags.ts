import { KNOWLEDGE_FLAG_KEYS, KnowledgeFlagKey, KnowledgeFlags } from "@/domain/knowledge/types";

/** Every knowledge feature ships enabled — flags exist to allow gradual company-level rollback. */
export function defaultKnowledgeFlags(): Required<KnowledgeFlags> {
  return {
    suggestions: true,
    kits: true,
    clientProfiles: true,
    fbt: true,
    docPacks: true,
    searchBoost: true,
    importLearning: true,
  };
}

/** Merge stored overrides onto the default flag set, ignoring unknown/invalid keys. */
export function mergeKnowledgeFlags(overrides?: KnowledgeFlags | null): Required<KnowledgeFlags> {
  const merged = defaultKnowledgeFlags();
  if (!overrides) return merged;
  for (const key of KNOWLEDGE_FLAG_KEYS) {
    if (typeof overrides[key] === "boolean") {
      merged[key] = overrides[key] as boolean;
    }
  }
  return merged;
}

/**
 * `undefined`/missing flags mean "enabled" — new features roll out on by
 * default and companies opt out explicitly, rather than opting in.
 */
export function isKnowledgeFeatureEnabled(
  flags: KnowledgeFlags | null | undefined,
  key: KnowledgeFlagKey,
): boolean {
  if (!flags) return true;
  const value = flags[key];
  return value !== false;
}
