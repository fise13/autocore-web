import {
  looksLikeBrokenDate,
  parseImportDate as parseMotorSheetDate,
} from "@/lib/motors/import/import-dates";

/**
 * Reading the two dates a dismantler's book keeps: when a unit came in, and
 * when it went out.
 *
 * The parsing itself is the motors importer's — `@/lib/motors/import/import-dates`
 * already knows that `.` is d.m.y because that is how people here type, that
 * `/` is m/d/y because that is what SheetJS emits for a formatted date cell,
 * that a bare number is an Excel serial, and that `28.09.20245` is a slipped
 * finger rather than a year. Writing a second parser would mean the same file
 * could import as two different days depending on which importer read it.
 *
 * What this adds is what the business import meets and the motors grid does
 * not: a date living inside a sentence. On the СВЕРДЛОВА and ВОЗВРАТ sheets
 * the cell reads `СВЕРДЛОВА 29.07.24` — a place and a date together — and
 * refusing it would throw away the only date those sheets carry.
 *
 * The stored form is a plain `YYYY-MM-DD` string, because a plan is JSON and a
 * book records days, not instants.
 */

export type ParsedImportDate = {
  /** ISO calendar date, `YYYY-MM-DD`. */
  iso: string;
  /** 0–1. Lower when the date had to be found inside other text. */
  confidence: number;
  reason: string;
};

/** A date-shaped run of digits anywhere in the cell. */
const DATE_IN_TEXT = /\d{1,4}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{2,5}/;

export type ParseDateOptions = {
  /**
   * Accept a bare number as an Excel serial. Only true where a header already
   * says the column is a date — otherwise a 45 000 km odometer reading parses
   * as a day in 2023.
   */
  allowSerial?: boolean;
};

export function parseImportDate(
  raw: string,
  options: ParseDateOptions = {},
): ParsedImportDate | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const whole = parseMotorSheetDate(trimmed);
  if (whole) return { iso: toIso(whole), confidence: 0.95, reason: "Дата распознана" };

  const embedded = DATE_IN_TEXT.exec(trimmed);
  if (embedded) {
    const inner = parseMotorSheetDate(embedded[0].replace(/\s+/g, ""));
    if (inner) {
      return {
        iso: toIso(inner),
        // Found rather than read: the cell says other things too, and one of
        // them could be the date of something else entirely.
        confidence: 0.75,
        reason: `Дата взята из текста «${trimmed.slice(0, 60)}»`,
      };
    }
  }

  if (options.allowSerial) {
    const serial = Number(trimmed.replace(/\s/g, "").replace(",", "."));
    if (Number.isInteger(serial)) {
      const parsed = parseMotorSheetDate(serial);
      if (parsed) {
        return { iso: toIso(parsed), confidence: 0.9, reason: "Дата из числового формата Excel" };
      }
    }
  }

  return null;
}

/** True when a cell reads as a date without having to guess. */
export function looksLikeImportDate(value: string): boolean {
  return parseImportDate(value) !== null;
}

/**
 * A cell that is clearly meant to be a date and cannot be read as one.
 *
 * Worth saying out loud rather than leaving blank: `28.09.20245` is somebody's
 * sale, and a person can fix it in ten seconds if they are told which row.
 */
export function isUnreadableDate(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (parseImportDate(trimmed)) return false;
  // Wider than the motors check on purpose: this file also holds «31.09.2024»
  // (September has thirty days), «22.12 2025» (a space where a dot belongs)
  // and «25.08.202523.07.2024» (two dates typed into one cell). All three are
  // a person's date and none of them can be read — which is worth one line in
  // the row's issues rather than an empty column nobody notices.
  return DATE_SHAPED.test(trimmed) || looksLikeBrokenDate(trimmed);
}

/** Digits arranged the way a date is, whether or not they make one. */
const DATE_SHAPED = /\d{1,4}\s*[./\- ]\s*\d{1,2}\s*[./\- ]\s*\d{2,5}/;

/**
 * The stored ISO day back to the instant the writers persist.
 *
 * Midday UTC, matching the motors importer: a calendar day stored at midnight
 * renders as the previous day for every reader west of UTC, so the same import
 * would show 09.06 in one office and 10.06 in another.
 */
export function importDateToDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
