import { fold } from "@/lib/domain/normalize";
import type { DomainSearchResult } from "@/lib/domain/types";

/**
 * Decide what value to commit from a domain cell / autocomplete field.
 *
 * - Exact dictionary hit → canonical name
 * - User moved highlight with arrows → highlighted entry
 * - Partial prefix still being typed → top suggestion (VS Code ghost style)
 * - Otherwise → keep what the user typed (new company term)
 */
export function resolveDomainCommitValue(
  value: string,
  results: DomainSearchResult[],
  activeIndex: number,
  userNavigated: boolean,
): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const key = fold(trimmed);
  const exact = results.find((result) => fold(result.entry.name) === key);
  if (exact) return exact.entry.name;

  if (userNavigated && results[activeIndex]) {
    return results[activeIndex].entry.name;
  }

  const top = results[0];
  if (top && activeIndex === 0) {
    const topKey = fold(top.entry.name);
    if (topKey.startsWith(key) && key.length < topKey.length) {
      return top.entry.name;
    }
  }

  return trimmed;
}

export function domainValueNeedsCompanyEntry(
  value: string,
  results: DomainSearchResult[],
): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const key = fold(trimmed);
  return !results.some((result) => fold(result.entry.name) === key);
}
