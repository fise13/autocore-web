import { AccountingPreferences } from "@/hooks/use-accounting-preferences";

import { ACCOUNTING_CATEGORY_SUGGESTIONS } from "./accounting-categories";

export function buildAccountingCategorySuggestions(
  accounting: Pick<AccountingPreferences, "employees" | "specifics">,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const add = (item: string) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  };

  for (const specific of accounting.specifics) {
    add(specific);
  }
  for (const employee of accounting.employees) {
    add(`зарплата ${employee}`);
    add(`аванс ${employee}`);
  }

  for (const fallback of ACCOUNTING_CATEGORY_SUGGESTIONS) {
    add(fallback);
  }

  return result;
}

export function filterAccountingCategorySuggestions(prefix: string, suggestions: string[]): string[] {
  const query = prefix.trim().toLowerCase();
  if (!query) return suggestions;
  return suggestions.filter((item) => item.toLowerCase().includes(query));
}
