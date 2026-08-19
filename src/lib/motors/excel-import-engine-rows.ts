import { joinGridFragments, sanitizeGridText } from "@/lib/import/ai-grid-contract";
import { formatMotorDate } from "@/lib/motor-dates";
import {
  createAutoColumnMapping,
  isLikelySoldSheetName,
  SheetColumnMapping,
} from "@/lib/motors/excel-column-mapping";
import { SheetImportConfig, effectiveBrand, effectiveEngineCode } from "@/lib/motors/excel-sheet-config";
import { ExcelSheetData, ParsedImportMotorRow } from "@/lib/motors/excel-types";
import { coerceBrandEnginePair } from "@/lib/motors/import/brand-engine-intelligence";
import { parseEngineNumberCell } from "@/lib/motors/import/engine-number";
import { projectOntoMotorGrid } from "@/lib/motors/import/grid-contract";
import { looksLikeBrokenDate, parseImportDate } from "@/lib/motors/import/import-dates";
import {
  compactQualifierFragments,
  dropRedundantSheetQualifier,
  extractQualifiers,
  routeQualifierText,
} from "@/lib/motors/import/qualifiers";
import { scanMotorSheetStructure } from "@/lib/motors/import/sheet-structure";
import { isLikelyMotorCatalogName } from "@/lib/motors/import/specific-category-intelligence";

function getCell(row: string[], index: number | undefined): string {
  if (index == null || index < 0 || index >= row.length) return "";
  return row[index]?.trim() ?? "";
}

const LIKELY_SERIAL_CELL = /^[A-Z0-9][A-Z0-9\-_.]{2,}$/i;
const SERIAL_HEADER_HINTS = /серий|serial|номер\s*двиг|engine\s*no|двигател/i;
const DATE_LIKE = /^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/;
const PRICE_LIKE = /^\d+([.,]\d+)?\s*(руб|₽)?$/i;

const SERIAL_SAMPLE_ROWS = 48;
const SERIAL_COLUMN_MIN_SCORE = 2;

function rowHasMeaningfulData(row: string[], skipColumnIndex: number | null): boolean {
  return row.some((cell, index) => index !== skipColumnIndex && sanitizeGridText(cell).length > 0);
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

function columnIndexFor(
  mapping: SheetColumnMapping,
  field: NonNullable<SheetColumnMapping["columnMappings"][number]["engineFieldMapping"]>,
): number | undefined {
  return mapping.columnMappings.find((item) => item.engineFieldMapping === field)?.columnIndex;
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

/** Column roles come from the headers alone; the import type does not change them. */
export function createSheetColumnMapping(sheet: ExcelSheetData) {
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

/** Columns with a header but no grid role — kept verbatim in notes so nothing is lost. */
function leftoverColumnNotes(row: string[], mapping: SheetColumnMapping): string[] {
  const notes: string[] = [];
  for (const column of mapping.columnMappings) {
    if (column.engineFieldMapping) continue;
    const value = sanitizeGridText(getCell(row, column.columnIndex));
    if (!value) continue;
    // A spreadsheet renders 12/4/23 for a date cell; spelled out, the note stays readable.
    const asDate = parseImportDate(value);
    const display = asDate ? formatMotorDate(asDate) : value;
    const label = sanitizeGridText(column.headerValue);
    notes.push(label ? `${label}: ${display}` : display);
  }
  return notes;
}

/**
 * Turn one sheet into grid rows.
 *
 * The sheet is read structurally: title rows give the brand and engine family, section
 * headings re-scope them mid-sheet, and each ENGINE NUMBER cell is split into ENGINE and
 * ENGINE NUMBER. Operational qualifiers land in CONFIGURATION, anything unclaimed lands in
 * SPECIAL NOTES, and every remaining cell stays empty rather than being guessed at.
 */
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

  const structure = scanMotorSheetStructure(sheet, mapping, { serialColumnIndex: serialIndex });
  const soldSheetHint = isLikelySoldSheetName(sheet.name);
  const sheetBrand = effectiveBrand(config);
  const sheetEngine = effectiveEngineCode(config);
  const rows: ParsedImportMotorRow[] = [];

  const brandIndex = columnIndexFor(mapping, "brandName");
  const engineIndex = columnIndexFor(mapping, "engineCode");
  const configurationIndex = columnIndexFor(mapping, "configuration");
  const notesIndex = columnIndexFor(mapping, "notes");
  const qualityIndex = columnIndexFor(mapping, "quality");
  const quantityIndex = columnIndexFor(mapping, "quantity");
  const locationIndex = columnIndexFor(mapping, "warehouseLocation");
  const transmissionIndex = columnIndexFor(mapping, "transmission");
  const arrivalIndex = columnIndexFor(mapping, "arrivalDate");
  const soldIndex = columnIndexFor(mapping, "soldDate");

  for (let rowIndex = structure.dataStartIndex; rowIndex < sheet.rows.length; rowIndex += 1) {
    if (structure.sectionRows.has(rowIndex)) continue;
    if (structure.junkRows.has(rowIndex)) continue;

    const row = sheet.rows[rowIndex] ?? [];
    if (!row.some((cell) => sanitizeGridText(cell))) continue;

    const context = structure.contextAt(rowIndex);
    const warnings: string[] = [];

    const numberCell =
      (serialIndex != null ? getCell(row, serialIndex) : "") ||
      extractSerialFromRow(row, { sheetName: sheet.name, skipColumnIndex: serialIndex });

    const parts = parseEngineNumberCell(numberCell, { subaruContext: context.subaruContext });
    if (parts.serialPlaceholder) {
      warnings.push("Номер двигателя не указан в файле — ячейка была заполнителем");
    }

    if (!parts.serialCode && !parts.engineCode && !rowHasMeaningfulData(row, serialIndex)) {
      continue;
    }
    if (!parts.serialCode && !parts.engineCode && !motorCatalogSheet && serialIndex == null) {
      continue;
    }

    // ENGINE: the row's own prefix wins, then a section heading, then the sheet.
    const engineFromColumn = sanitizeGridText(getCell(row, engineIndex));
    const engineCandidate =
      parts.engineCode || engineFromColumn || context.engineCode || sheetEngine;

    if (
      parts.engineCode &&
      context.families.length > 0 &&
      !context.families.includes(parts.engineCode)
    ) {
      warnings.push(
        `Код двигателя «${parts.engineCode}» не совпадает с листом (${context.families.join(", ")})`,
      );
    }
    if (!parts.engineCode && !engineFromColumn && context.families.length > 1) {
      warnings.push(
        `Лист охватывает несколько двигателей (${context.families.join(", ")}) — проверьте колонку ENGINE`,
      );
    }

    const brandFromColumn = sanitizeGridText(getCell(row, brandIndex));
    const brandCandidate = brandFromColumn || context.brandName || sheetBrand;

    const coerced = coerceBrandEnginePair(brandCandidate, engineCandidate, {
      serial: parts.serialCode,
      sheetName: sheet.name,
    });

    const arrivalRaw = getCell(row, arrivalIndex);
    const soldRaw = getCell(row, soldIndex);
    const arrivalDate = parseImportDate(arrivalRaw);
    const soldDate = parseImportDate(soldRaw);

    // A date column that holds prose ("СВЕРДЛОВА 29.07.24", "ПОСЛЕ ДЭНА- ВЕРНУЛИСЬ 16.08")
    // must not evaporate just because it is not a date.
    const arrivalResidue = arrivalDate
      ? { configuration: "", notes: "", ids: [] as string[] }
      : routeQualifierText(arrivalRaw);
    const soldResidue = soldDate
      ? { configuration: "", notes: "", ids: [] as string[] }
      : routeQualifierText(soldRaw);

    if (looksLikeBrokenDate(arrivalRaw)) {
      warnings.push(`Дата прихода не распознана: «${sanitizeGridText(arrivalRaw)}»`);
    }
    if (looksLikeBrokenDate(soldRaw)) {
      warnings.push(`Дата продажи не распознана: «${sanitizeGridText(soldRaw)}»`);
    }
    if (soldSheetHint && !soldDate) {
      // Never substitute today's date — that invents a sale.
      warnings.push("Лист продаж, но дата продажи не указана — проверьте строку");
    }

    // CONFIGURATION: equipment, then qualifiers from every free-text cell, then leftovers.
    const configurationCell = routeQualifierText(getCell(row, configurationIndex));
    const notesCell = routeQualifierText(getCell(row, notesIndex));
    const transmissionRaw = sanitizeGridText(getCell(row, transmissionIndex));
    const transmissionQualifiers = extractQualifiers(transmissionRaw);

    const rowQualifierIds = [
      ...configurationCell.ids,
      ...notesCell.ids,
      ...arrivalResidue.ids,
      ...soldResidue.ids,
      ...transmissionQualifiers.ids,
    ];

    const configuration = compactQualifierFragments(joinGridFragments([
      configurationCell.configuration,
      configurationCell.notes,
      notesCell.configuration,
      arrivalResidue.configuration,
      soldResidue.configuration,
      dropRedundantSheetQualifier(context.qualifier, rowQualifierIds),
      ...parts.extras,
      ...transmissionQualifiers.matches,
    ]));

    const notes = joinGridFragments([
      notesCell.notes,
      arrivalResidue.notes,
      soldResidue.notes,
      ...leftoverColumnNotes(row, mapping),
    ]);

    const grid = projectOntoMotorGrid({
      brandName: coerced.brand,
      engineCode: coerced.engine,
      serialCode: parts.serialCode,
      configuration,
      notes,
      quality: getCell(row, qualityIndex),
      quantity: getCell(row, quantityIndex),
      transmission: transmissionQualifiers.pureQualifier ? "" : transmissionRaw,
      warehouseLocation: getCell(row, locationIndex),
      arrivalDate,
      soldDate,
    });

    if (!grid.serialCode) {
      warnings.push("Серийник не найден в строке");
    }

    rows.push({
      sheetName: sheet.name,
      serialCode: grid.serialCode,
      configuration: grid.configuration,
      notes: grid.notes,
      quality: grid.quality,
      quantity: grid.quantity,
      transmission: grid.transmission,
      warehouseLocation: grid.warehouseLocation,
      arrivalDate: grid.arrivalDate,
      soldDate: grid.soldDate,
      brandName: grid.brandName,
      engineCode: grid.engineCode,
      rawRowCells: summarizeRawCells(row),
      sourceRowIndex: rowIndex,
      rowWarnings: warnings,
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
