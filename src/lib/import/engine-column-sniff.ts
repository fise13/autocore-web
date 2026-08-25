import { countEngineCodeValues } from "@/lib/motors/import/engine-code-shorthand";

/**
 * Finding the engine column by what is *in* it, not by what it is called.
 *
 * `detectMotorInventoryContext` used to require a header matching
 * `/номер\s*двигател|engine\s*number|serial/`. Real stock books do not oblige:
 * the workbook behind the 5142 unnamed rows is organised by branch — the sheet
 * is called «СВЕРДЛОВА», the address of the yard — and the column holding
 * `EJ251- C085834` is headed simply «НОМЕР». No header matched, so the motor
 * profile never engaged, nothing enriched the rows, and every one of them
 * landed as Untitled with no brand and no category.
 *
 * A column full of engine codes is unmistakable regardless of its title, so
 * this sniffs the values. It is deliberately strict — a clear majority of
 * non-empty cells must read as engine codes, over a minimum sample — because
 * mistaking a random code column for engines would relabel a whole sheet.
 *
 * Pure — no I/O.
 */

/** Fewest non-empty cells needed before a verdict is trustworthy. */
export const MIN_ENGINE_COLUMN_SAMPLE = 4;

/** Share of non-empty cells that must read as engine codes. */
export const ENGINE_COLUMN_THRESHOLD = 0.6;

/** How many rows to look at. Enough to be sure, cheap on a 5000-row sheet. */
const SCAN_LIMIT = 200;

export type EngineColumnMatch = {
  header: string;
  /** Non-empty cells inspected. */
  sampled: number;
  /** Of those, how many read as an engine code. */
  matched: number;
  ratio: number;
};

function nonEmpty(value: string | undefined): boolean {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 && trimmed !== "—" && trimmed !== "-" && trimmed.toUpperCase() !== "N/A";
}

/**
 * The column whose values read as engine codes, or null when none is
 * convincing. When several qualify the strongest ratio wins, and ties go to
 * the column with more evidence behind it.
 */
export function findEngineCodeColumn(
  headers: readonly string[],
  rows: readonly Record<string, string>[],
): EngineColumnMatch | null {
  const scanned = rows.slice(0, SCAN_LIMIT);
  let best: EngineColumnMatch | null = null;

  for (const header of headers) {
    const values = scanned
      .map((row) => row[header])
      .filter((value): value is string => nonEmpty(value));
    if (values.length < MIN_ENGINE_COLUMN_SAMPLE) continue;

    const matched = countEngineCodeValues(values);
    const ratio = matched / values.length;
    if (ratio < ENGINE_COLUMN_THRESHOLD) continue;

    const candidate: EngineColumnMatch = {
      header,
      sampled: values.length,
      matched,
      ratio,
    };
    if (!best || candidate.ratio > best.ratio) {
      best = candidate;
      continue;
    }
    if (candidate.ratio === best.ratio && candidate.sampled > best.sampled) {
      best = candidate;
    }
  }

  return best;
}
