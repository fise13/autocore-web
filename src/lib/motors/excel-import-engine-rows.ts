import {
  createAutoColumnMapping,
  isLikelySoldSheetName,
  SheetColumnMapping,
} from "@/lib/motors/excel-column-mapping";
import { parseExcelDateValue } from "@/lib/motors/excel-dates";
import { SheetImportConfig, effectiveBrand, effectiveEngineCode } from "@/lib/motors/excel-sheet-config";
import { ExcelSheetData, ParsedImportMotorRow } from "@/lib/motors/excel-types";
import { coerceBrandEnginePair } from "@/lib/motors/import/brand-engine-intelligence";

function getCell(row: string[], index: number | undefined): string {
  if (index == null || index < 0 || index >= row.length) return "";
  return row[index]?.trim() ?? "";
}

function parseQuantity(value: string): number {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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

export function buildEngineRowsFromSheet(
  sheet: ExcelSheetData,
  config: SheetImportConfig,
  mapping: SheetColumnMapping,
): ParsedImportMotorRow[] {
  const serialIndex = columnIndexFor(mapping, "serialCode");
  if (serialIndex == null) return [];

  const soldSheetHint = isLikelySoldSheetName(sheet.name);
  const sheetBrand = effectiveBrand(config);
  const sheetEngine = effectiveEngineCode(config);
  const dataStartIndex = (mapping.headerRowIndex ?? -1) + 1;
  const rows: ParsedImportMotorRow[] = [];

  for (let rowIndex = dataStartIndex; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? [];
    const serialCode = getCell(row, serialIndex);
    if (!serialCode) continue;

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
