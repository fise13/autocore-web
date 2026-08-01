import type { AutocompleteFuelBadge } from './types';

/** Infer fuel badge from free-form engine metadata. */
export function inferEngineFuelBadge(
  sources: Array<string | undefined | null>,
): AutocompleteFuelBadge | undefined {
  const haystack = sources
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!haystack) return undefined;

  if (/\b(hybrid|hev|phev|mhev)\b/.test(haystack)) return 'Hybrid';
  if (/\b(diesel|tdi|cdi|dci|hdi|jtd|ddis|crdi|tdci)\b/.test(haystack)) return 'Diesel';
  if (/\b(gasoline|petrol|mpi|gdi|tfsi|tsi|ecoboost|vtec)\b/.test(haystack)) return 'Gasoline';

  // Default for known engine dictionary entries without explicit fuel cues.
  if (/\bengine\b/.test(haystack) || sources.some(Boolean)) return 'Gasoline';
  return undefined;
}

export function computeMatchRanges(
  text: string,
  query: string,
): Array<{ start: number; end: number }> {
  const q = query.trim();
  if (!q || !text) return [];

  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];

  let from = 0;
  while (from < lowerText.length) {
    const index = lowerText.indexOf(lowerQuery, from);
    if (index < 0) break;
    ranges.push({ start: index, end: index + lowerQuery.length });
    from = index + lowerQuery.length;
  }

  if (ranges.length > 0) return ranges;

  // Fuzzy: highlight contiguous prefix of query characters found in order.
  let qi = 0;
  let start = -1;
  for (let i = 0; i < lowerText.length && qi < lowerQuery.length; i += 1) {
    if (lowerText[i] !== lowerQuery[qi]) {
      if (start >= 0) break;
      continue;
    }
    if (start < 0) start = i;
    qi += 1;
    if (qi === lowerQuery.length) {
      ranges.push({ start, end: i + 1 });
      break;
    }
  }

  return ranges;
}
