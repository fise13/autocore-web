import { readEngineCode } from "@/lib/motors/import/engine-code-shorthand";
import { pushLocationHeading } from "@/lib/warehouse/location-path";

import { sanitizeGridText } from "../ai-grid-contract";
import type { ParsedTable } from "../types";
import {
  decision,
  type DiscoveredRow,
  type ImportDiscovery,
  type RowRole,
  type SheetDiscovery,
} from "./contracts";

/**
 * Pass 1 — what each physical row *is*, before asking what it describes.
 *
 * The engine has always treated a parsed sheet as a table of records: header
 * row, then N rows of data. Books kept by hand are not that. They carry
 * section headings, running totals, free-text notes and blank separators, and
 * every one of those used to arrive at `classifyRecord` as a candidate piece
 * of stock. That is how a catalogue ends up with an engine called "ИТОГО" and
 * a donor called "склад на Свердлова".
 *
 * The pass is deterministic on purpose. Row *shape* — how many cells are
 * filled, where, and whether they are numbers — is exactly the kind of
 * question that does not need a language model, and a model would be slower,
 * costlier and less repeatable at it. The AI passes above this one get a
 * cleaner input as a result, and the section headings this finds become
 * context those passes could not otherwise see.
 *
 * Pure — no I/O.
 */

/** Words that make a row a total wherever they appear in its first cells. */
const TOTAL_WORDS = [
  "итого",
  "итог",
  "всего",
  "сумма",
  "подытог",
  "total",
  "totals",
  "subtotal",
  "grand total",
  "баланс",
];

/** Leading words that mark a free-text note rather than a record. */
const NOTE_WORDS = [
  "примечание",
  "заметка",
  "внимание",
  "note",
  "notes",
  "comment",
  "комментарий",
  "важно",
];

function folded(value: string): string {
  return sanitizeGridText(value).toLowerCase();
}

function filledCells(row: Record<string, string>, headers: readonly string[]): string[] {
  return headers.map((header) => sanitizeGridText(row[header] ?? "")).filter(Boolean);
}

function looksNumeric(value: string): boolean {
  const cleaned = value.replace(/[\s\u00a0]/g, "").replace(",", ".");
  if (!cleaned) return false;
  return /^-?\d+(\.\d+)?$/.test(cleaned);
}

function startsWithAny(text: string, words: readonly string[]): boolean {
  return words.some((word) => text === word || text.startsWith(`${word} `) || text.startsWith(`${word}:`));
}

function containsTotalWord(cells: readonly string[]): boolean {
  return cells.some((cell) => {
    const text = folded(cell);
    return TOTAL_WORDS.some((word) => text === word || text.startsWith(`${word} `) || text.startsWith(`${word}:`));
  });
}

/**
 * Whether a lone cell is an identifier rather than prose — an engine code, a
 * serial, a part number. A record with only its number filled in is still a
 * record, and calling it a heading swallowed the row *and* every row beneath
 * it into a section that did not exist.
 */
function looksLikeIdentifier(value: string): boolean {
  if (readEngineCode(value)) return true;
  // A run of four or more digits is a unit number, not a title.
  if (/\d{4,}/.test(value)) return true;
  // Mixed letters and digits with no real word in it: "C085834", "TZ1A4".
  return /\d/.test(value) && !/[\p{L}]{4,}/u.test(value);
}

/**
 * A heading that names the section below it: one filled cell, prose rather
 * than an identifier, and short enough to be a title rather than a sentence.
 */
function isSectionHeading(cells: readonly string[]): boolean {
  if (cells.length !== 1) return false;
  const only = cells[0]!;
  if (looksNumeric(only)) return false;
  if (only.length > 60) return false;
  if (looksLikeIdentifier(only)) return false;
  // Needs a real word in it — "СВЕРДЛОВА", "СКЛАД НА СЕЙФУЛЛИНА".
  return /[\p{L}]{3,}/u.test(only);
}

/** The header row repeated mid-sheet, as spreadsheets glued together often do. */
function isRepeatedHeader(cells: readonly string[], headers: readonly string[]): boolean {
  if (cells.length < 2) return false;
  const headerSet = new Set(headers.map((header) => folded(header)).filter(Boolean));
  if (headerSet.size === 0) return false;
  const matches = cells.filter((cell) => headerSet.has(folded(cell))).length;
  return matches >= Math.max(2, Math.ceil(cells.length * 0.6));
}

function classifyRow(
  row: Record<string, string>,
  headers: readonly string[],
): { role: RowRole; reason: string } {
  const cells = filledCells(row, headers);

  if (cells.length === 0) {
    return { role: "separator", reason: "Пустая строка-разделитель" };
  }

  if (isRepeatedHeader(cells, headers)) {
    return { role: "repeated-header", reason: "Повтор строки заголовков" };
  }

  if (containsTotalWord(cells)) {
    return { role: "total", reason: "Строка итогов" };
  }

  // A row of nothing but numbers, in a sheet that has text columns, is a
  // total line whose label was left off.
  if (cells.length > 1 && cells.every(looksNumeric) && headers.length > cells.length) {
    return { role: "total", reason: "Строка только из чисел — похоже на итог" };
  }

  if (cells.length === 1 && startsWithAny(folded(cells[0]!), NOTE_WORDS)) {
    return { role: "note", reason: "Свободный комментарий" };
  }

  if (isSectionHeading(cells)) {
    return { role: "section-header", reason: "Заголовок раздела" };
  }

  return { role: "record", reason: "Строка данных" };
}

export function discoverSheet(table: ParsedTable): SheetDiscovery {
  const rows: DiscoveredRow[] = [];
  const recordIndexes: number[] = [];
  const sections: string[] = [];
  let currentSection: string | null = null;
  let locationStack: string[] = [];

  table.rows.forEach((row, index) => {
    const { role, reason } = classifyRow(row, table.headers);

    if (role === "section-header") {
      currentSection = filledCells(row, table.headers)[0] ?? null;
      if (currentSection) {
        sections.push(currentSection);
        locationStack = pushLocationHeading(locationStack, currentSection);
      }
    }

    rows.push({
      index,
      role,
      section: role === "section-header" ? null : currentSection,
      locationPath: role === "section-header" ? [] : [...locationStack],
      decision: decision("entity", role === "record" ? 0.95 : 0.9, reason, "rules"),
    });

    if (role === "record") recordIndexes.push(index);
  });

  return { table: table.name, recordIndexes, rows, sections };
}

export function discoverTables(tables: readonly ParsedTable[]): ImportDiscovery {
  const sheets = tables.map(discoverSheet);
  const ignored: ImportDiscovery["ignored"] = [];

  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      if (row.role === "record") continue;
      ignored.push({
        table: sheet.table,
        index: row.index,
        role: row.role,
        reason: row.decision.reason,
      });
    }
  }

  return { sheets, ignored };
}
