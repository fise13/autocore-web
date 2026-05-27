import * as XLSX from "xlsx";

import {
  createAutoColumnMapping,
  isLikelySoldSheetName,
  parseSheetBrandEngine,
  SheetColumnMapping,
} from "@/lib/motors/excel-column-mapping";
import { parseExcelDateValue } from "@/lib/motors/excel-dates";
import { ExcelSheetData, ParsedImportMotorRow } from "@/lib/motors/excel-types";

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    const d = String(value.getDate()).padStart(2, "0");
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const y = value.getFullYear();
    return `${d}.${m}.${y}`;
  }
  return String(value).trim();
}

function sheetRowsFromWorksheet(worksheet: XLSX.WorkSheet): string[][] {
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  return matrix.map((row) => row.map((cell) => cellToString(cell)));
}

export async function readExcelSheets(file: File): Promise<ExcelSheetData[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  return workbook.SheetNames.map((name) => {
    const worksheet = workbook.Sheets[name];
    return {
      name,
      rows: worksheet ? sheetRowsFromWorksheet(worksheet) : [],
    };
  }).filter((sheet) => sheet.rows.length > 0);
}

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

function buildImportRows(sheet: ExcelSheetData): ParsedImportMotorRow[] {
  const mapping = createAutoColumnMapping(sheet.rows);
  const serialIndex = columnIndexFor(mapping, "serialCode");
  if (serialIndex == null) return [];

  const soldSheetHint = isLikelySoldSheetName(sheet.name);
  const sheetBrandEngine = parseSheetBrandEngine(sheet.name);
  const dataStartIndex = (mapping.headerRowIndex ?? -1) + 1;
  const rows: ParsedImportMotorRow[] = [];

  for (let rowIndex = dataStartIndex; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? [];
    const serialCode = getCell(row, serialIndex);
    if (!serialCode) continue;

    const brandFromRow = getCell(row, columnIndexFor(mapping, "brandName"));
    const engineFromRow = getCell(row, columnIndexFor(mapping, "engineCode"));
    const arrivalDate = parseExcelDateValue(getCell(row, columnIndexFor(mapping, "arrivalDate")) || null);
    let soldDate = parseExcelDateValue(getCell(row, columnIndexFor(mapping, "soldDate")) || null);

    if (!soldDate && soldSheetHint) {
      soldDate = arrivalDate ?? new Date();
    }

    rows.push({
      sheetName: sheet.name,
      serialCode,
      configuration: getCell(row, columnIndexFor(mapping, "configuration")),
      notes: getCell(row, columnIndexFor(mapping, "notes")),
      quantity: parseQuantity(getCell(row, columnIndexFor(mapping, "quantity"))),
      transmission: getCell(row, columnIndexFor(mapping, "transmission")),
      arrivalDate,
      soldDate,
      brandName: brandFromRow || sheetBrandEngine?.brandName || "Cloud",
      engineCode: engineFromRow || sheetBrandEngine?.engineCode || "—",
    });
  }

  return rows;
}

export function parseMotorRowsFromExcelSheets(sheets: ExcelSheetData[]): ParsedImportMotorRow[] {
  const merged: ParsedImportMotorRow[] = [];
  for (const sheet of sheets) {
    merged.push(...buildImportRows(sheet));
  }
  return merged;
}

export async function parseMotorRowsFromExcelFile(file: File): Promise<ParsedImportMotorRow[]> {
  const sheets = await readExcelSheets(file);
  return parseMotorRowsFromExcelSheets(sheets);
}
