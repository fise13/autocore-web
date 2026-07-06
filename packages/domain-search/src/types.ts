export const DOMAIN_CATEGORIES = ['engines', 'brands'] as const;

export type DomainCategory = (typeof DOMAIN_CATEGORIES)[number];

export type DomainEntry = {
  id: string;
  name: string;
  category?: string;
  brand?: string;
  hint?: string;
  aliases?: string[];
  type?: string;
  custom?: boolean;
};

export type DomainSearchResult = {
  entry: DomainEntry;
  score: number;
  match: DomainMatchKind;
};

export type DomainMatchKind =
  | 'exact'
  | 'prefix'
  | 'word-prefix'
  | 'substring'
  | 'subsequence'
  | 'typo';

export type DomainSearchOptions = {
  limit?: number;
  includeEmpty?: boolean;
};
