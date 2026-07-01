/**
 * Domain Intelligence Engine — shared types.
 *
 * A single dictionary model powers every autocomplete surface in AutoCore
 * (Excel grid, Magic Import, search, filters, dialogs, mobile). Each category
 * is a flat list of {@link DomainEntry} records that the {@link DomainDictionary}
 * indexes for fuzzy, transliteration- and typo-aware lookup.
 */

export const DOMAIN_CATEGORIES = [
  "engines",
  "transmissions",
  "bodyParts",
  "consumables",
  "brands",
  "models",
  "fuelTypes",
  "driveTypes",
  "colors",
  "countries",
] as const;

export type DomainCategory = (typeof DOMAIN_CATEGORIES)[number];

/** A single dictionary record. Stable across global and company dictionaries. */
export type DomainEntry = {
  /** Stable identifier, unique within a category. */
  id: string;
  /** Canonical display name (what gets written into the field). */
  name: string;
  /** Optional grouping label shown in the dropdown (e.g. "Оптика", "Subaru"). */
  category?: string;
  /** Parent brand, when relevant (engines, transmissions, models). */
  brand?: string;
  /** Free-form secondary line for the dropdown (volume, power, notes). */
  hint?: string;
  /** Alternate spellings, translit variants, abbreviations, typos. */
  aliases?: string[];
  /** Stable kind tag, mirrors the category by default. */
  type?: string;
  /** True when the entry comes from a company dictionary, not the global one. */
  custom?: boolean;
};

/** A scored search hit. */
export type DomainSearchResult = {
  entry: DomainEntry;
  /** Higher is better. */
  score: number;
  /** Why it matched — useful for debugging and UI affordances. */
  match: DomainMatchKind;
};

export type DomainMatchKind =
  | "exact"
  | "prefix"
  | "word-prefix"
  | "substring"
  | "subsequence"
  | "typo";

export type DomainSearchOptions = {
  /** Max results to return. Defaults to 20. */
  limit?: number;
  /** When empty query: return the first N entries (true) or nothing (false). */
  includeEmpty?: boolean;
};
