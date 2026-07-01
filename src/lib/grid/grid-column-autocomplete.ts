import type { GridCellAddress } from "@/lib/grid/grid-types";

export function pickColumnAutocompleteMatch(input: string, candidates: string[]): string | null {
  const query = input;
  if (!query.trim()) return null;

  const lower = query.toLowerCase();
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed.length <= query.length) continue;
    if (trimmed.toLowerCase().startsWith(lower)) {
      return trimmed;
    }
  }

  return null;
}

export function autocompleteSuffixForMatch(input: string, match: string | null): string {
  if (!match) return "";
  if (!match.toLowerCase().startsWith(input.toLowerCase())) return "";
  return match.slice(input.length);
}

/** Filter and rank column candidates for the editor dropdown. */
export function filterColumnSuggestions(
  input: string,
  candidates: string[],
  limit = 30,
): string[] {
  const query = input.trim().toLowerCase();
  const unique = [...new Set(candidates.map((item) => item.trim()).filter(Boolean))];

  if (!query) return unique.slice(0, limit);

  const scored = unique
    .map((candidate) => {
      const lower = candidate.toLowerCase();
      if (lower === query) return { candidate, score: 1000 };
      if (lower.startsWith(query)) return { candidate, score: 900 - (candidate.length - query.length) };
      if (lower.includes(query)) return { candidate, score: 600 - (candidate.length - query.length) };
      return null;
    })
    .filter((item): item is { candidate: string; score: number } => item !== null)
    .sort((a, b) => b.score - a.score || a.candidate.localeCompare(b.candidate, "ru"));

  return scored.slice(0, limit).map((item) => item.candidate);
}

export function resolveGridColumnAutocomplete(
  editor: { cell: GridCellAddress; value: string } | null,
  rowCount: number,
  valueAt: (row: number, column: number) => string,
  enabled: (column: number) => boolean = () => true,
): string | null {
  if (!editor || !enabled(editor.cell.column)) return null;

  const seen = new Set<string>();
  const candidates: string[] = [];

  for (let row = 0; row < rowCount; row += 1) {
    if (row === editor.cell.row) continue;
    const value = valueAt(row, editor.cell.column).trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(value);
  }

  return pickColumnAutocompleteMatch(editor.value, candidates);
}
