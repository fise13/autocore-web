"use client";

import { useCallback, useContext, useMemo } from "react";

import { DomainDictionaryContext } from "@/components/domain/domain-dictionary-provider";
import { searchDomain } from "@/lib/domain/domain-dictionary";
import type {
  CompanyDomainEntry,
} from "@/lib/domain/company-dictionary";
import type {
  DomainCategory,
  DomainSearchOptions,
  DomainSearchResult,
} from "@/lib/domain/types";

export type UseDomainAutocomplete = {
  /** Search global + company dictionaries. Fast and memoized. */
  search: (query: string, options?: DomainSearchOptions) => DomainSearchResult[];
  /** Best single match, or null. */
  resolve: (query: string) => DomainSearchResult | null;
  /** Add an unknown value to the company dictionary (not the global one). */
  addToCompanyDictionary: (
    name: string,
    extras?: Partial<CompanyDomainEntry>,
  ) => Promise<CompanyDomainEntry | null>;
  /** True when a Company Dictionary provider is mounted above. */
  hasCompanyDictionary: boolean;
};

/**
 * The single autocomplete API for the whole product.
 *
 *   const engines = useDomainAutocomplete("engines");
 *   engines.search("ej2"); // → EJ205, EJ207, …
 *
 * Works with or without a {@link DomainDictionaryProvider}; the provider only
 * adds the per-company overlay and persistence of new terms.
 */
export function useDomainAutocomplete(category: DomainCategory): UseDomainAutocomplete {
  const context = useContext(DomainDictionaryContext);
  const companyDictionary = context?.getCompanyDictionary(category) ?? null;

  const search = useCallback(
    (query: string, options?: DomainSearchOptions) =>
      searchDomain(category, query, companyDictionary, options),
    [category, companyDictionary],
  );

  const resolve = useCallback(
    (query: string) => search(query, { limit: 1 })[0] ?? null,
    [search],
  );

  const addToCompanyDictionary = useCallback(
    (name: string, extras?: Partial<CompanyDomainEntry>) =>
      context?.addCompanyEntry(category, name, extras) ?? Promise.resolve(null),
    [category, context],
  );

  return useMemo(
    () => ({
      search,
      resolve,
      addToCompanyDictionary,
      hasCompanyDictionary: Boolean(context),
    }),
    [search, resolve, addToCompanyDictionary, context],
  );
}
