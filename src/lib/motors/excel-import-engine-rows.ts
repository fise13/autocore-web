import {
  createAutoColumnMapping,
  isLikelySoldSheetName,
  SheetColumnMapping,
} from "@/lib/motors/excel-column-mapping";
import { parseExcelDateValue } from "@/lib/motors/excel-dates";
import { SheetImportConfig, effectiveBrand, effectiveEngineCode } from "@/lib/motors/excel-sheet-config";
import { ExcelSheetData, ParsedImportMotorRow } from "@/lib/motors/excel-types";
import { coerceBrandEnginePair } from "@/lib/motors/import/brand-engine-intelligence";
import { isLikelyMotorCatalogName } from "@/lib/motors/import/specific-category-intelligence";

function getCell(row: string[], index: number | undefined): string {
  if (index == null || index < 0 || index >= row.length) return "";
  return row[index]?.trim() ?? "";
}

function parseQuantity(value: string): number {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

const LIKELY_SERIAL_CELL = /^[A-Z0-9][A-Z0-9\-_.]{2,}$/i;
const SERIAL_HEADER_HINTS = /серий|serial|номер\s*двиг|engine\s*no|двигател/i;
const DATE_LIKE = /^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/;
const PRICE_LIKE = /^\d+([.,]\d+)?\s*(руб|₽)?$/i;

const SERIAL_SAMPLE_ROWS = 48;
const SERIAL_COLUMN_MIN_SCORE = 2;

function rowHasMeaningfulData(row: string[], skipColumnIndex: number | null): boolean {
  return row.some((cell, index) => index !== skipColumnIndex && cell.trim().length > 0);
}

function isLikelyNonSerialCell(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (DATE_LIKE.test(trimmed)) return true;
  if (PRICE_LIKE.test(trimmed)) return true;
  if (/^\d+$/.test(trimmed) && trimmed.length <= 3) return true;
  return false;
}

const CONFIGURATION_TOKENS =
  /^(2wd|4wd|awd|rwd|fwd|cvt|at|mt|акпп|мкпп|полный|без|полная|неполная)$/i;

function scoreSerialCell(cell: string, sheetName?: string): number {
  if (!cell || isLikelyNonSerialCell(cell)) return 0;
  if (CONFIGURATION_TOKENS.test(cell.trim())) return 0;

  let score = 0;
  const hasLetter = /[A-Z]/i.test(cell);
  const hasDigit = /\d/.test(cell);

  if (hasLetter && hasDigit) {
    score += 2;
    if (cell.includes("-")) score += 1;
  } else if (LIKELY_SERIAL_CELL.test(cell)) {
    score += 1;
  }

  if (sheetName) {
    const sheetToken = sheetName.replace(/\s+/g, "").slice(0, 4).toUpperCase();
    if (sheetToken.length >= 2 && hasLetter && hasDigit && cell.toUpperCase().startsWith(sheetToken)) {
      score += 1;
    }
  }

  return score;
}

export function extractSerialFromRow(
  row: string[],
  context?: { sheetName?: string; skipColumnIndex?: number | null },
): string {
  const skip = context?.skipColumnIndex ?? null;
  let best = "";
  let bestScore = 0;

  for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
    if (columnIndex === skip) continue;
    const cell = row[columnIndex]?.trim() ?? "";
    const score = scoreSerialCell(cell, context?.sheetName);
    if (score > bestScore) {
      bestScore = score;
      best = cell;
    }
  }

  return bestScore >= 2 ? best : "";
}

function summarizeRawCells(row: string[]): string {
  return row
    .map((cell) => cell.trim())
    .filter(Boolean)
    .join(" · ")
    .slice(0, 480);
}

export function inferSerialColumnIndex(
  sheet: ExcelSheetData,
  mapping: SheetColumnMapping,
): number | null {
  const explicit = columnIndexFor(mapping, "serialCode");
  if (explicit != null) return explicit;

  const dataStartIndex = (mapping.headerRowIndex ?? -1) + 1;
  const headerRow = sheet.rows[mapping.headerRowIndex ?? 0] ?? [];
  const maxColumn = sheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
  let bestIndex: number | null = null;
  let bestScore = 0;

  for (let columnIndex = 0; columnIndex < maxColumn; columnIndex += 1) {
    let score = 0;
    const header = getCell(headerRow, columnIndex).toLowerCase();
    if (SERIAL_HEADER_HINTS.test(header) || header === "№" || header === "no") {
      score += 5;
    }

    const sampleEnd = Math.min(sheet.rows.length, dataStartIndex + SERIAL_SAMPLE_ROWS);
    for (let rowIndex = dataStartIndex; rowIndex < sampleEnd; rowIndex += 1) {
      const cell = getCell(sheet.rows[rowIndex] ?? [], columnIndex);
      score += scoreSerialCell(cell, sheet.name);
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = columnIndex;
    }
  }

  return bestScore >= SERIAL_COLUMN_MIN_SCORE ? bestIndex : null;
}

function columnIndexFor(
  mapping: SheetColumnMapping,
  field: NonNullable<SheetColumnMapping["columnMappings"][number]["engineFieldMapping"]>,
): number | undefined {
  return mapping.columnMappings.find((item) => item.engineFieldMapping === field)?.columnIndex;
}

export function createSheetColumnMapping(sheet: ExcelSheetData, importType: SheetImportConfig["importType"]) {
  if (importType === "skip") {
    return createAutoColumnMapping(sheet.rows);
  }
  return createAutoColumnMapping(sheet.rows);
}

function sheetHasImportableDataRows(
  sheet: ExcelSheetData,
  mapping: SheetColumnMapping,
  serialIndex: number | null,
): boolean {
  const dataStartIndex = (mapping.headerRowIndex ?? -1) + 1;
  for (let rowIndex = dataStartIndex; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? [];
    if (serialIndex != null && getCell(row, serialIndex)) return true;
    if (extractSerialFromRow(row, { sheetName: sheet.name, skipColumnIndex: serialIndex })) return true;
    if (rowHasMeaningfulData(row, serialIndex)) return true;
  }
  return false;
}

export function buildEngineRowsFromSheet(
  sheet: ExcelSheetData,
  config: SheetImportConfig,
  mapping: SheetColumnMapping,
): ParsedImportMotorRow[] {
  const serialIndex = inferSerialColumnIndex(sheet, mapping);
  const motorCatalogSheet =
    isLikelyMotorCatalogName(sheet.name) || isLikelySoldSheetName(sheet.name);

  if (serialIndex == null && !motorCatalogSheet) return [];
  if (serialIndex == null && !sheetHasImportableDataRows(sheet, mapping, null)) return [];

  const soldSheetHint = isLikelySoldSheetName(sheet.name);
  const sheetBrand = effectiveBrand(config);
  const sheetEngine = effectiveEngineCode(config);
  const dataStartIndex = (mapping.headerRowIndex ?? -1) + 1;
  const rows: ParsedImportMotorRow[] = [];

  for (let rowIndex = dataStartIndex; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? [];
    let serialCode = serialIndex != null ? getCell(row, serialIndex) : "";
    if (!serialCode) {
      serialCode = extractSerialFromRow(row, { sheetName: sheet.name, skipColumnIndex: serialIndex });
    }

    if (!serialCode) {
      if (!rowHasMeaningfulData(row, serialIndex)) continue;
      if (!motorCatalogSheet) continue;
    }

    const arrivalDate = parseExcelDateValue(getCell(row, columnIndexFor(mapping, "arrivalDate")) || null);
    let soldDate = parseExcelDateValue(getCell(row, columnIndexFor(mapping, "soldDate")) || null);

    if (!soldDate && soldSheetHint) {
      soldDate = arrivalDate ?? new Date();
    }

    const brandFromRow = getCell(row, columnIndexFor(mapping, "brandName"));
    const engineFromRow = getCell(row, columnIndexFor(mapping, "engineCode"));
    const coerced = coerceBrandEnginePair(brandFromRow || sheetBrand, engineFromRow || sheetEngine, {
      serial: serialCode,
      sheetName: sheet.name,
    });

    rows.push({
      sheetName: sheet.name,
      serialCode,
      configuration: getCell(row, columnIndexFor(mapping, "configuration")),
      notes: getCell(row, columnIndexFor(mapping, "notes")),
      quantity: parseQuantity(getCell(row, columnIndexFor(mapping, "quantity"))),
      transmission: getCell(row, columnIndexFor(mapping, "transmission")),
      arrivalDate,
      soldDate,
      brandName: coerced.brand || "Не указан",
      engineCode: coerced.engine || "—",
      rawRowCells: summarizeRawCells(row),
    });
  }

  return rows;
}

export function mappingHasSerialColumn(mapping: SheetColumnMapping): boolean {
  return mapping.columnMappings.some((item) => item.engineFieldMapping === "serialCode");
}

export function buildSpecificRowsFromSheet(
  sheet: ExcelSheetData,
  mapping: SheetColumnMapping,
): Record<string, string>[] {
  const dataStartIndex = (mapping.headerRowIndex ?? -1) + 1;
  const rows: Record<string, string>[] = [];

  for (let rowIndex = dataStartIndex; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? [];
    const rowData: Record<string, string> = {};
    let hasData = false;

    for (const columnMapping of mapping.columnMappings) {
      const fieldName = columnMapping.headerValue?.trim();
      if (!fieldName) continue;
      const value = getCell(row, columnMapping.columnIndex);
      if (value) hasData = true;
      rowData[fieldName] = value;
    }

    if (hasData) {
      rows.push(rowData);
    }
  }

  return rows;
}
