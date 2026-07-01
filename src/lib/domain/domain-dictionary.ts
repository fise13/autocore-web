/**
 * DomainDictionary — the single search engine behind every AutoCore
 * autocomplete surface.
 *
 * Design goals:
 * - Sub-20ms lookups even at 100k+ entries → inverted token-prefix index, so
 *   most queries only score a small candidate set instead of scanning.
 * - Script-agnostic → Cyrillic and Latin collapse into one comparison space.
 * - Forgiving → prefix, word-prefix, substring, subsequence and bounded typo
 *   matching, all scored so the best canonical name floats to the top.
 * - Memoized → repeated queries (debounced typing) hit a small LRU cache.
 */

import {
  compact,
  levenshtein,
  normalizedVariants,
  tokenize,
  typoBudget,
} from "@/lib/domain/normalize";
import type {
  DomainCategory,
  DomainEntry,
  DomainSearchOptions,
  DomainSearchResult,
  DomainMatchKind,
} from "@/lib/domain/types";
import { GLOBAL_DICTIONARIES } from "@/lib/domain/dictionaries";

type IndexedEntry = {
  entry: DomainEntry;
  /** Whole terms (name/aliases/brand/category) in compact, translit-expanded form. */
  terms: string[];
  /** Individual word tokens in compact, translit-expanded form. */
  tokens: string[];
};

const PREFIX_DEPTH = 3;
const CACHE_LIMIT = 200;
const FULL_SCAN_LIMIT = 5000;

const SCORE = {
  exact: 1000,
  prefix: 880,
  wordPrefix: 760,
  substring: 600,
  subsequence: 360,
  typo: 320,
} as const;

export class DomainDictionary {
  private readonly indexed: IndexedEntry[] = [];
  private readonly buckets = new Map<string, Set<number>>();
  private readonly cache = new Map<string, DomainSearchResult[]>();

  constructor(entries: DomainEntry[] = []) {
    for (const entry of entries) this.add(entry);
  }

  get size(): number {
    return this.indexed.length;
  }

  /** Index a single entry. Safe to call after construction (company additions). */
  add(entry: DomainEntry): void {
    const index = this.indexed.length;
    const termSources = [entry.name, entry.brand, entry.category, ...(entry.aliases ?? [])]
      .filter((value): value is string => Boolean(value));

    const terms = new Set<string>();
    const tokens = new Set<string>();
    for (const source of termSources) {
      for (const variant of normalizedVariants(source)) {
        if (variant) terms.add(variant);
      }
      for (const token of tokenize(source)) tokens.add(token);
    }

    this.indexed.push({ entry, terms: [...terms], tokens: [...tokens] });

    for (const token of tokens) {
      const depth = Math.min(token.length, PREFIX_DEPTH);
      for (let len = 1; len <= depth; len += 1) {
        this.bucket(token.slice(0, len)).add(index);
      }
    }
    this.cache.clear();
  }

  search(query: string, options: DomainSearchOptions = {}): DomainSearchResult[] {
    const limit = options.limit ?? 20;
    const trimmed = query.trim();

    if (!trimmed) {
      if (!options.includeEmpty) return [];
      return this.indexed
        .slice(0, limit)
        .map((item) => ({ entry: item.entry, score: SCORE.prefix, match: "prefix" as const }));
    }

    const cacheKey = `${limit}::${trimmed.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const variants = normalizedVariants(trimmed);
    const candidates = this.collectCandidates(variants);

    const results: DomainSearchResult[] = [];
    for (const index of candidates) {
      const item = this.indexed[index];
      const scored = this.scoreEntry(item, variants);
      if (scored) results.push({ entry: item.entry, score: scored.score, match: scored.match });
    }

    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const lenDiff = a.entry.name.length - b.entry.name.length;
      if (lenDiff !== 0) return lenDiff;
      return a.entry.name.localeCompare(b.entry.name, "ru");
    });

    const sliced = results.slice(0, limit);
    this.remember(cacheKey, sliced);
    return sliced;
  }

  /** Convenience: best single match or null. */
  resolve(query: string): DomainEntry | null {
    return this.search(query, { limit: 1 })[0]?.entry ?? null;
  }

  private collectCandidates(variants: string[]): Set<number> {
    const candidates = new Set<number>();
    let prefixHit = false;

    for (const variant of variants) {
      const key = variant.slice(0, PREFIX_DEPTH);
      const bucket = this.buckets.get(key);
      if (bucket) {
        prefixHit = true;
        for (const index of bucket) candidates.add(index);
      }
    }

    // Infix / typo queries that no prefix bucket covers fall back to a bounded
    // scan. Triggered rarely (the common case is prefix typing), so the hot
    // path stays fast while correctness is preserved.
    if (!prefixHit && this.indexed.length <= FULL_SCAN_LIMIT) {
      for (let index = 0; index < this.indexed.length; index += 1) candidates.add(index);
    }

    return candidates;
  }

  private scoreEntry(
    item: IndexedEntry,
    variants: string[],
  ): { score: number; match: DomainMatchKind } | null {
    let bestScore = -Infinity;
    let bestMatch: DomainMatchKind = "substring";

    const consider = (score: number, match: DomainMatchKind) => {
      if (score > bestScore) {
        bestScore = score;
        bestMatch = match;
      }
    };

    for (const q of variants) {
      if (!q) continue;
      const budget = typoBudget(q.length);

      for (const term of item.terms) {
        if (term === q) {
          consider(SCORE.exact, "exact");
        } else if (term.startsWith(q)) {
          consider(SCORE.prefix - (term.length - q.length), "prefix");
        } else if (term.includes(q)) {
          consider(SCORE.substring - (term.length - q.length), "substring");
        } else if (isSubsequence(q, term)) {
          consider(SCORE.subsequence, "subsequence");
        }
      }

      for (const token of item.tokens) {
        if (token === q) {
          consider(SCORE.exact, "exact");
        } else if (token.startsWith(q)) {
          consider(SCORE.wordPrefix - (token.length - q.length), "word-prefix");
        }
      }

      if (bestScore < SCORE.subsequence && budget > 0) {
        for (const token of item.tokens) {
          const dist = levenshtein(q, token, budget);
          if (dist <= budget) consider(SCORE.typo - dist * 40, "typo");
        }
      }
    }

    if (bestScore === -Infinity) return null;
    return { score: bestScore, match: bestMatch };
  }

  private bucket(key: string): Set<number> {
    let set = this.buckets.get(key);
    if (!set) {
      set = new Set<number>();
      this.buckets.set(key, set);
    }
    return set;
  }

  private remember(key: string, value: DomainSearchResult[]): void {
    if (this.cache.size >= CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, value);
  }
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (needle.length > haystack.length) return false;
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j += 1) {
    if (needle[i] === haystack[j]) i += 1;
  }
  return i === needle.length;
}

const globalCache = new Map<DomainCategory, DomainDictionary>();

/** Cached singleton dictionary for a global category. */
export function getGlobalDictionary(category: DomainCategory): DomainDictionary {
  let dict = globalCache.get(category);
  if (!dict) {
    dict = new DomainDictionary(GLOBAL_DICTIONARIES[category] ?? []);
    globalCache.set(category, dict);
  }
  return dict;
}

/**
 * Search a category across the global dictionary plus an optional company
 * overlay. Company entries are merged in and de-duplicated by canonical name,
 * preferring the company's own wording.
 */
export function searchDomain(
  category: DomainCategory,
  query: string,
  companyDictionary?: DomainDictionary | null,
  options?: DomainSearchOptions,
): DomainSearchResult[] {
  const limit = options?.limit ?? 20;
  const globalResults = getGlobalDictionary(category).search(query, options);
  if (!companyDictionary || companyDictionary.size === 0) return globalResults;

  const companyResults = companyDictionary.search(query, options);
  const merged = [...companyResults, ...globalResults].sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const deduped: DomainSearchResult[] = [];
  for (const result of merged) {
    const key = compact(result.entry.name);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
    if (deduped.length >= limit) break;
  }
  return deduped;
}
