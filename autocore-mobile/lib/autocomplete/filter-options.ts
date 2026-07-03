import type { AutocompleteOption } from './types';

export function filterAutocompleteOptions(
  query: string,
  options: AutocompleteOption[],
  matchMode: 'prefix' | 'flexible' = 'prefix',
  limit = 8,
): AutocompleteOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options.slice(0, limit);

  return options
    .filter((option) => {
      const candidates = [option.value, option.label, option.keywords].filter(Boolean) as string[];
      return candidates.some((candidate) => {
        const lower = candidate.toLowerCase();
        return matchMode === 'prefix' ? lower.startsWith(normalized) : lower.includes(normalized);
      });
    })
    .slice(0, limit);
}

export function uniqueAutocompleteOptions(options: AutocompleteOption[], limit = 120): AutocompleteOption[] {
  const seen = new Set<string>();
  const merged: AutocompleteOption[] = [];

  for (const option of options) {
    const key = option.value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(option);
    if (merged.length >= limit) break;
  }

  return merged;
}
