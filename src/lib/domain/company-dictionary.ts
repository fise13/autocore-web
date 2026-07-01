/**
 * Company Dictionary — per-company overlay on top of the global dictionaries.
 *
 * When a user types a term AutoCore doesn't know ("Ноускат", "Телевизор",
 * "Контрактный двигатель"), they can save it. It lands here — scoped to the
 * company — and participates in every future search alongside global entries.
 * It never mutates the shipped global dictionaries.
 */

import { DomainDictionary } from "@/lib/domain/domain-dictionary";
import { compact } from "@/lib/domain/normalize";
import type { DomainCategory, DomainEntry } from "@/lib/domain/types";

/** Persisted shape of a company-defined term (one Firestore doc per entry). */
export type CompanyDomainEntry = DomainEntry & {
  category: string;
  domainCategory: DomainCategory;
  createdAt?: number;
  createdByUserId?: string;
};

/** All company terms grouped by domain category. */
export type CompanyDomainMap = Partial<Record<DomainCategory, CompanyDomainEntry[]>>;

/** Build a searchable dictionary from a company's stored entries for a category. */
export function buildCompanyDictionary(entries: CompanyDomainEntry[] | undefined): DomainDictionary {
  const dict = new DomainDictionary();
  for (const entry of entries ?? []) {
    dict.add({ ...entry, custom: true });
  }
  return dict;
}

/** Create a normalized company entry from raw user input. */
export function createCompanyEntry(
  domainCategory: DomainCategory,
  name: string,
  extras?: Partial<CompanyDomainEntry>,
): CompanyDomainEntry {
  const trimmed = name.trim();
  return {
    id: `company:${domainCategory}:${compact(trimmed) || Date.now().toString(36)}`,
    name: trimmed,
    category: extras?.category ?? "Мои значения",
    domainCategory,
    type: domainCategory,
    custom: true,
    createdAt: Date.now(),
    ...extras,
  };
}

/** True when `name` already exists in the company entries for a category. */
export function companyEntryExists(
  entries: CompanyDomainEntry[] | undefined,
  name: string,
): boolean {
  const key = compact(name);
  if (!key) return false;
  return (entries ?? []).some((entry) => compact(entry.name) === key);
}
