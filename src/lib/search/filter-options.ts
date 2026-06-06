export type SearchOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
};

export function filterSearchOptions(options: SearchOption[], query: string, limit = 50): SearchOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return options.slice(0, limit);
  }

  return options
    .filter((option) => {
      const haystack = [option.label, option.description, option.keywords, option.value]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, limit);
}

export function matchSearchQuery(option: SearchOption, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [option.label, option.description, option.keywords, option.value]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}
