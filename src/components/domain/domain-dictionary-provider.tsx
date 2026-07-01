"use client";

import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";

import { DomainDictionary } from "@/lib/domain/domain-dictionary";
import {
  buildCompanyDictionary,
  companyEntryExists,
  createCompanyEntry,
  type CompanyDomainEntry,
  type CompanyDomainMap,
} from "@/lib/domain/company-dictionary";
import type { DomainCategory } from "@/lib/domain/types";

export type DomainDictionaryContextValue = {
  /** Company overlay dictionary for a category (empty when none defined). */
  getCompanyDictionary: (category: DomainCategory) => DomainDictionary;
  /** Persist a new company term and make it immediately searchable. */
  addCompanyEntry: (
    category: DomainCategory,
    name: string,
    extras?: Partial<CompanyDomainEntry>,
  ) => Promise<CompanyDomainEntry | null>;
  entries: CompanyDomainMap;
};

export const DomainDictionaryContext = createContext<DomainDictionaryContextValue | null>(null);

type DomainDictionaryProviderProps = {
  children: ReactNode;
  /** Company terms loaded from storage (e.g. Firestore). */
  initialEntries?: CompanyDomainMap;
  /**
   * Persist a newly created company term. The engine works without it; wire
   * this to Firestore to make additions durable across sessions/devices.
   */
  onCreateEntry?: (entry: CompanyDomainEntry) => Promise<void> | void;
};

const EMPTY_DICTIONARY = new DomainDictionary();

export function DomainDictionaryProvider({
  children,
  initialEntries,
  onCreateEntry,
}: DomainDictionaryProviderProps) {
  const [entries, setEntries] = useState<CompanyDomainMap>(initialEntries ?? {});

  const dictionaries = useMemo(() => {
    const map = new Map<DomainCategory, DomainDictionary>();
    for (const key of Object.keys(entries) as DomainCategory[]) {
      map.set(key, buildCompanyDictionary(entries[key]));
    }
    return map;
  }, [entries]);

  const getCompanyDictionary = useCallback(
    (category: DomainCategory) => dictionaries.get(category) ?? EMPTY_DICTIONARY,
    [dictionaries],
  );

  const addCompanyEntry = useCallback<DomainDictionaryContextValue["addCompanyEntry"]>(
    async (category, name, extras) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      if (companyEntryExists(entries[category], trimmed)) return null;

      const entry = createCompanyEntry(category, trimmed, extras);
      setEntries((current) => ({
        ...current,
        [category]: [...(current[category] ?? []), entry],
      }));

      try {
        await onCreateEntry?.(entry);
      } catch {
        // Local-only addition still works; durable persistence is best-effort.
      }
      return entry;
    },
    [entries, onCreateEntry],
  );

  const value = useMemo<DomainDictionaryContextValue>(
    () => ({ getCompanyDictionary, addCompanyEntry, entries }),
    [getCompanyDictionary, addCompanyEntry, entries],
  );

  return (
    <DomainDictionaryContext.Provider value={value}>{children}</DomainDictionaryContext.Provider>
  );
}
