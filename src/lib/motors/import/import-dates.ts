import { isGridPlaceholder, sanitizeGridText } from "@/lib/import/ai-grid-contract";

/**
 * Date parsing for imports.
 *
 * Two things went wrong with the generic parser and both silently corrupted the grid:
 * a nonsense date like `28.09.20245` fell through to `new Date(string)` and produced a
 * date thousands of years out, and a sold sheet with an unreadable date got today's date
 * substituted — inventing a sale that never happened.
 *
 * Everything here returns a Date at midday UTC so the grid renders the day the spreadsheet
 * says, in any timezone.
 */

const MIN_YEAR = 1970;
const MAX_YEAR = 2100;

/**
 * Midday UTC, not midnight.
 *
 * A spreadsheet date is a calendar day with no time. Storing it at midnight makes the
 * rendered day depend on the reader's timezone — the same import shows 09.06 in one office
 * and 10.06 in another. Midday UTC renders as the same calendar day everywhere from UTC-11
 * to UTC+12.
 */
function calendarDate(year: number, month: number, day: number): Date | null {
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  // Rejects 31.09 / 30.02 rather than rolling over into the next month.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function expandTwoDigitYear(value: number): number {
  if (value >= 100) return value;
  return value <= 79 ? 2000 + value : 1900 + value;
}

/**
 * Parse one spreadsheet date cell.
 *
 * Separator decides the order, which is how these files are actually written:
 * `.` is the Russian d.m.y (`10.06.2024`), `/` is the US m/d/y that SheetJS emits for
 * a default-formatted date cell (`6/10/24`), and `-` is ISO y-m-d.
 */
export function parseImportDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial day count (1900 epoch, with the Lotus leap-year quirk).
    const parsed = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    if (!Number.isFinite(parsed.getTime())) return null;
    return calendarDate(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
  }

  const text = sanitizeGridText(value);
  if (!text || isGridPlaceholder(text)) return null;

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (iso) {
    return calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const dotted = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotted) {
    return calendarDate(expandTwoDigitYear(Number(dotted[3])), Number(dotted[2]), Number(dotted[1]));
  }

  const slashed = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashed) {
    const month = Number(slashed[1]);
    const day = Number(slashed[2]);
    const year = expandTwoDigitYear(Number(slashed[3]));
    // A "month" above 12 means the file used d/m/y after all.
    return month > 12 ? calendarDate(year, day, month) : calendarDate(year, month, day);
  }

  const dashed = text.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dashed) {
    return calendarDate(expandTwoDigitYear(Number(dashed[3])), Number(dashed[2]), Number(dashed[1]));
  }

  return null;
}

/** True when the cell holds something date-shaped that could not be read. */
export function looksLikeBrokenDate(value: unknown): boolean {
  const text = sanitizeGridText(value);
  if (!text) return false;
  if (parseImportDate(text)) return false;
  return /\d{1,2}[./-]\d{1,2}[./-]\d{2,5}|\d{4}-\d{1,2}-\d{1,2}/.test(text);
}
