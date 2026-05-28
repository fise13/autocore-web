import { cleanCell } from "@/lib/warehouse/import/preprocessor";

import { ExcelSheetData } from "@/lib/motors/excel-types";

export function preprocessMotorSheets(sheets: ExcelSheetData[]): ExcelSheetData[] {
  return sheets.map((sheet) => ({
    name: sheet.name,
    rows: sheet.rows
      .map((row) => row.map((cell) => cleanCell(cell)))
      .filter((row) => row.some((cell) => cell.length > 0)),
  }));
}

export function normalizeSerial(value: string): string {
  return cleanCell(value).toLowerCase();
}
