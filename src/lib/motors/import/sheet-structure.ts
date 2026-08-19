import { isGridPlaceholder, joinGridFragments, sanitizeGridText } from "@/lib/import/ai-grid-contract";
import { SheetColumnMapping } from "@/lib/motors/excel-column-mapping";
import { ExcelSheetData } from "@/lib/motors/excel-types";
import {
  detectBrandInSheetName,
  resolveBrandDisplayName,
} from "@/lib/motors/import-normalization";

import {
  looksLikeEngineFamily,
  normalizeFamilyCode,
  parseEngineFamilyList,
  parseEngineNumberCell,
} from "./engine-number";
import { inferBrandFromEngineCode } from "./brand-engine-intelligence";
import { qualifierFromSheetName } from "./qualifiers";

/**
 * Dismantling sheets are not flat tables. A tab looks like this:
 *
 *   row 0   SUBARU-EJ251            <- title: brand + engine family
 *   row 1   НОМЕР ДВИГАТЕЛЯ | …     <- header
 *   row 2   C090606 | ГУР | …       <- data
 *   …
 *   row 40  VQ40                    <- section heading: everything below is a VQ40
 *   row 41  VQ40- 386275A | …       <- data
 *
 * Reading the tab name alone loses both the title and the section headings, and turns the
 * headings themselves into phantom motors. This module recovers that structure so every
 * data row knows which brand, engine family and operational qualifier apply to it.
 */

export type MotorRowContext = {
  brandName: string;
  /** Best single family for rows in this scope; "" when several are possible. */
  engineCode: string;
  /** Every family this scope names, primary first. */
  families: string[];
  /** Operational qualifier that belongs in CONFIGURATION for rows in this scope. */
  qualifier: string;
  /** Enables the bare-EJ2xx expansion when splitting engine numbers. */
  subaruContext: boolean;
  /** Where the context came from — used for warnings. */
  source: "sheet" | "section";
};

export type MotorSheetStructure = {
  headerRowIndex: number | null;
  dataStartIndex: number;
  titleRows: string[];
  sheetContext: MotorRowContext;
  /** Rows that only declare a section — never emitted as motors. */
  sectionRows: Set<number>;
  /** Rows whose every cell is a placeholder ("N/A"). */
  junkRows: Set<number>;
  contextAt(rowIndex: number): MotorRowContext;
};

const MOTOR_HEADER_HINT =
  /номер\s*двигател|номер\s*мотор|серийн|комплектац|особые\s*отмет|кол-?во|дата\s*приход|дата\s*продаж|марка|причина|описание\s*работ/i;

function nonEmptyCells(row: string[]): Array<{ index: number; value: string }> {
  const cells: Array<{ index: number; value: string }> = [];
  row.forEach((cell, index) => {
    const value = sanitizeGridText(cell);
    if (value) cells.push({ index, value });
  });
  return cells;
}

/** Header row: the first row that reads like motor column titles, else the mapping's guess. */
export function detectMotorHeaderRowIndex(
  rows: string[][],
  fallback: number | null,
): number | null {
  const limit = Math.min(rows.length, 12);
  for (let index = 0; index < limit; index += 1) {
    const cells = nonEmptyCells(rows[index] ?? []);
    if (cells.length < 2) continue;
    const joined = cells.map((cell) => cell.value).join(" ");
    if (MOTOR_HEADER_HINT.test(joined)) return index;
  }
  return fallback;
}

function subaruSignal(label: string, brand: string): boolean {
  if (resolveBrandDisplayName(brand) === "Subaru") return true;
  return /\b(subaru|EJ\s?\d|EZ\s?\d|FA\s?\d|FB\s?\d|FC\s?\d)/i.test(label);
}

/** Read brand / families / qualifier out of one label (tab name, title row, section cell). */
function contextFromLabel(label: string, inherited?: MotorRowContext): MotorRowContext {
  const clean = sanitizeGridText(label);
  const brandFromLabel = detectBrandInSheetName(clean);
  const subaru = subaruSignal(clean, brandFromLabel || inherited?.brandName || "");
  const families = parseEngineFamilyList(clean, { subaruContext: subaru });
  const brand =
    brandFromLabel ||
    (families[0] ? inferBrandFromEngineCode(families[0]) ?? "" : "") ||
    inherited?.brandName ||
    "";

  return {
    brandName: resolveBrandDisplayName(brand),
    engineCode: families[0] ?? "",
    families,
    qualifier: qualifierFromSheetName(clean),
    subaruContext: subaru || subaruSignal(clean, brand),
    source: "sheet",
  };
}

function mergeContexts(base: MotorRowContext, override: MotorRowContext): MotorRowContext {
  const families = [...override.families];
  for (const family of base.families) {
    if (!families.includes(family)) families.push(family);
  }
  return {
    brandName: override.brandName || base.brandName,
    engineCode: override.engineCode || base.engineCode,
    families,
    qualifier: joinGridFragments([base.qualifier, override.qualifier]),
    subaruContext: base.subaruContext || override.subaruContext,
    source: override.source,
  };
}

/**
 * A lone cell that names a brand, an engine family or a movement — the rows below it
 * inherit it, and the cell itself is not a motor.
 */
function readSectionHeading(value: string, context: MotorRowContext): MotorRowContext | null {
  const clean = sanitizeGridText(value);
  if (!clean || clean.length > 48) return null;

  const brand = detectBrandInSheetName(clean);
  const qualifier = qualifierFromSheetName(clean);
  const hasDigits = /\d/.test(clean);

  // A digit-free cell cannot be an engine number, so a brand or a movement word is a heading:
  // "RENAULT", "FORD", "SUBARU", "МОТОРЫ ПОСЛЕ ДЭНА".
  if (!hasDigits) {
    if (!brand && !qualifier) return null;
    return {
      brandName: resolveBrandDisplayName(brand),
      engineCode: "",
      families: [],
      qualifier,
      subaruContext: subaruSignal(clean, brand),
      source: "section",
    };
  }

  // A short family on its own — "VQ40", "VQ35", "1KZ", "2KD" — scopes the rows below it.
  const isLoneFamily =
    !/[-–—\s]/.test(clean) &&
    clean.length <= 6 &&
    looksLikeEngineFamily(clean, { subaruContext: context.subaruContext });
  if (!isLoneFamily) return null;

  const parts = parseEngineNumberCell(clean, { subaruContext: context.subaruContext });
  const familyCode = parts.engineCode || normalizeFamilyCode(clean, { subaruContext: context.subaruContext });
  if (!familyCode) return null;

  const families = [familyCode];
  const resolvedBrand = brand || inferBrandFromEngineCode(familyCode) || "";

  return {
    brandName: resolveBrandDisplayName(resolvedBrand),
    engineCode: families[0] ?? "",
    families,
    qualifier,
    subaruContext: subaruSignal(clean, resolvedBrand),
    source: "section",
  };
}

/** Title rows are the ones above the header: `SUBARU-EJ251`, `ТОРГОВЫЙ СКЛАД`. */
function titleRowsOf(rows: string[][], headerRowIndex: number | null): string[] {
  return rows
    .slice(0, Math.max(headerRowIndex ?? 0, 0))
    .map((row) => nonEmptyCells(row).map((cell) => cell.value).join(" "))
    .filter(Boolean);
}

/**
 * Brand, engine families and qualifier for a whole sheet, read from the tab name *and* the
 * title rows above the header. The tab often says `201-204-205` while the title says
 * `SUBARU-204` — the title is the one that names a single engine.
 */
/**
 * Movement logs («СВЕРДЛОВА», «ВОЗВРАТ») name neither brand nor engine, yet their rows are
 * full of `EJ251- …` / `EZ30- …`. Reading that from the data is what lets a bare `253AVCS-`
 * on the same sheet expand to `ej253avcs` instead of falling out as an unrecognised token.
 */
const SUBARU_DATA_SIGNAL = /(^|[^A-Z])(EJ|EZ|FA|FB|FC)\s?-?\s?\d/i;

function detectSubaruDataSignal(rows: string[][], dataStartIndex: number): boolean {
  const end = Math.min(rows.length, dataStartIndex + 200);
  for (let rowIndex = Math.max(dataStartIndex, 0); rowIndex < end; rowIndex += 1) {
    for (const cell of rows[rowIndex] ?? []) {
      if (SUBARU_DATA_SIGNAL.test(cell ?? "")) return true;
    }
  }
  return false;
}

export function resolveSheetIdentity(sheetName: string, rows: string[][]): MotorRowContext {
  const headerRowIndex = detectMotorHeaderRowIndex(rows, null);
  let context = contextFromLabel(sheetName);

  if (!context.subaruContext && detectSubaruDataSignal(rows, (headerRowIndex ?? -1) + 1)) {
    context = { ...context, subaruContext: true };
  }

  for (const title of titleRowsOf(rows, headerRowIndex)) {
    const fromTitle = contextFromLabel(title, context);
    if (fromTitle.brandName || fromTitle.families.length > 0 || fromTitle.qualifier) {
      context = mergeContexts(context, { ...fromTitle, source: "sheet" });
    }
  }

  // A tab name that only abbreviates numbers ("201-204-205") yields nothing on its own;
  // re-read it once the title has established the Subaru context.
  if (context.subaruContext) {
    const fromTab = contextFromLabel(sheetName, context);
    const families = [...context.families];
    for (const family of parseEngineFamilyList(sheetName, { subaruContext: true })) {
      if (!families.includes(family)) families.push(family);
    }
    context = {
      ...context,
      brandName: context.brandName || fromTab.brandName,
      engineCode: context.engineCode || families[0] || "",
      families,
    };
  }

  return context;
}

export function scanMotorSheetStructure(
  sheet: ExcelSheetData,
  mapping: SheetColumnMapping,
  options?: { serialColumnIndex?: number | null },
): MotorSheetStructure {
  const headerRowIndex = detectMotorHeaderRowIndex(sheet.rows, mapping.headerRowIndex);
  const dataStartIndex = (headerRowIndex ?? -1) + 1;
  const titleRows = titleRowsOf(sheet.rows, headerRowIndex);
  const sheetContext = resolveSheetIdentity(sheet.name, sheet.rows);

  const serialColumnIndex = options?.serialColumnIndex ?? null;
  const sectionRows = new Set<number>();
  const junkRows = new Set<number>();
  const contextByRow = new Map<number, MotorRowContext>();

  let running = sheetContext;

  for (let rowIndex = dataStartIndex; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? [];
    const cells = nonEmptyCells(row);

    if (cells.length === 0) continue;

    const raw = row.map((cell) => String(cell ?? "").trim()).filter(Boolean);
    if (raw.length > 0 && raw.every((cell) => isGridPlaceholder(cell))) {
      junkRows.add(rowIndex);
      continue;
    }

    if (cells.length === 1) {
      const only = cells[0];
      const inSerialColumn =
        serialColumnIndex == null ? only.index === 0 : only.index === serialColumnIndex || only.index === 0;
      if (inSerialColumn) {
        const heading = readSectionHeading(only.value, running);
        if (heading) {
          sectionRows.add(rowIndex);
          running = mergeContexts(sheetContext, heading);
          continue;
        }
      }
    }

    contextByRow.set(rowIndex, running);
  }

  return {
    headerRowIndex,
    dataStartIndex,
    titleRows,
    sheetContext,
    sectionRows,
    junkRows,
    contextAt(rowIndex: number) {
      return contextByRow.get(rowIndex) ?? sheetContext;
    },
  };
}
