/**
 * The base layer every import AI prompt is built on.
 *
 * Both importers (motors and warehouse/business) target a fixed application grid.
 * The model's only job is to place source cells into that grid — it is a mapper,
 * not a generator. The rules below are duplicated in code by the projectors
 * (`projectOntoMotorGrid`, `sanitizeGridText`) so a disobedient model cannot
 * corrupt the grid: the prompt asks, the projector enforces.
 */

/** Cell values that mean "the author left this blank", not real data. */
export const GRID_PLACEHOLDER_VALUES = [
  "n/a",
  "na",
  "n\\a",
  "#n/a",
  "-",
  "--",
  "—",
  "–",
  "?",
  "??",
  "???",
  "????",
  "null",
  "none",
  "nil",
  "undefined",
  "нет",
  "не указан",
  "не указано",
  "неизвестно",
  "пусто",
  "-/-",
  "хз",
] as const;

const PLACEHOLDER_SET = new Set<string>(GRID_PLACEHOLDER_VALUES);

/** True when a raw cell carries no information and must become an empty grid cell. */
export function isGridPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const normalized = trimmed
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.]+$/, "")
    .trim();
  // Trailing-dot stripping can empty the value outright ("...", "…").
  if (!normalized) return true;
  if (PLACEHOLDER_SET.has(normalized)) return true;
  // Runs of only separators / question marks: "???", "- - -", "...".
  return /^[-–—_.\s?]+$/.test(normalized);
}

/** Trim, collapse whitespace, and blank out placeholders. Never returns null. */
export function sanitizeGridText(value: unknown): string {
  if (value == null) return "";
  const text = String(value)
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return isGridPlaceholder(text) ? "" : text;
}

/** The separator grid cells use between fragments. */
export const GRID_FRAGMENT_SEPARATOR = " · ";

/**
 * Join grid fragments (qualifiers, leftovers) without duplicates or empty gaps.
 *
 * Already-joined values are split back apart first, so merging two rows that each carry
 * "РЕМОНТ ДЭН" produces one "РЕМОНТ ДЭН", not two.
 */
export function joinGridFragments(fragments: Array<string | undefined | null>): string {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const fragment of fragments) {
    const whole = sanitizeGridText(fragment);
    if (!whole) continue;
    for (const part of whole.split(GRID_FRAGMENT_SEPARATOR)) {
      const text = sanitizeGridText(part);
      if (!text) continue;
      const key = text.toLocaleLowerCase("ru");
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push(text);
    }
  }
  return kept.join(GRID_FRAGMENT_SEPARATOR);
}

/**
 * The rules block shared by every import prompt. Kept as one exported constant so
 * motors and warehouse prompts cannot drift apart.
 */
export const IMPORT_GRID_BASE_LAYER = `
YOU ARE A GRID MAPPER, NOT A DATA GENERATOR.
The application shows imported data in a fixed spreadsheet grid. Your only job is to decide
which source cell belongs in which grid column. You never author facts.

1. THE GRID IS THE CONTRACT
   - Return exactly the keys named in the schema. No extra keys, no renamed keys.
   - Every text column is a string. Unknown → "" (empty string).
   - NEVER write "-", "N/A", "n/a", "???", "нет", "неизвестно", "null" or any other filler.
     Those are blanks. Emit "" instead.
   - Empty is always correct when the source is empty. A plausible guess is always wrong.

2. NEVER INVENT
   - A value may only come from: this row's cells, the section header above this row,
     the sheet title, or the sheet tab name. Nothing else.
   - Do not complete partial serials, do not guess dates, do not infer prices, quantities,
     locations, quality grades or photos. If the source does not say it, the cell stays empty.
   - Inference is allowed ONLY where the schema explicitly says so (e.g. manufacturer from a
     known engine-family code). Lower your confidence when you infer.

3. NEVER LOSE DATA
   - Exactly one output object per input row, in input order, keyed by the given row id.
   - Never skip a non-empty row. Never merge two source rows into one.
   - Any non-empty source value that fits no column goes into the notes column verbatim,
     appended after existing notes with " · ". Losing a value is worse than an ugly note.
   - You may reformat and normalize. You may not delete.

4. RIGHT COLUMN OR NO COLUMN
   - Do not park a value in a neighbouring column to avoid an empty cell.
   - If you are not sure which of two columns a value belongs in, put it in notes and add a
     warning — do not gamble on the more specific column.

5. REPORT INSTEAD OF GUESSING
   - confidence is 0..1 and must drop when you infer rather than read.
   - warnings is a short list of plain sentences about what you could not resolve.
     The user reviews warnings before the import is committed; silence hides problems.
`.trim();

/** Machine-checkable summary of the base layer, for prompts that need it inline. */
export const IMPORT_GRID_BASE_LAYER_SHORT = `
Grid mapper rules: place source cells into the fixed grid columns; unknown → "" (never "-",
"N/A", "???"); never invent values; one output row per input row; anything that fits no column
goes verbatim into notes; lower confidence when inferring and explain gaps in warnings.
`.trim();
