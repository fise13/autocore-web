/** Normalizes user input for consistent matching. */
export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function compactAlphanumeric(value: string): string {
  return value.replace(/[\s\-_./]/g, '').toLowerCase();
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function tokenMatch(haystack: string, token: string): boolean {
  if (haystack.includes(token)) return true;
  const compactHaystack = compactAlphanumeric(haystack);
  const compactToken = compactAlphanumeric(token);
  return compactToken.length >= 3 && compactHaystack.includes(compactToken);
}

/**
 * Multi-token AND match with VIN/serial compaction and phone digit matching.
 * Mirrors web substring search with extra tolerance for codes and phones.
 */
export function matchesSearchQuery(
  haystack: string,
  query: string,
  options?: { phones?: string[] },
): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return false;

  const lowerHaystack = haystack.toLowerCase();
  const tokens = normalized.split(' ').filter(Boolean);

  const queryDigits = digitsOnly(query);
  if (queryDigits.length >= 4 && options?.phones?.length) {
    for (const phone of options.phones) {
      const phoneDigits = digitsOnly(phone);
      if (phoneDigits.length >= 4 && phoneDigits.includes(queryDigits)) {
        return true;
      }
    }
  }

  const compactQuery = compactAlphanumeric(query);
  if (compactQuery.length >= 4 && compactAlphanumeric(haystack).includes(compactQuery)) {
    return true;
  }

  return tokens.every((token) => tokenMatch(lowerHaystack, token));
}

export function joinSearchFields(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
