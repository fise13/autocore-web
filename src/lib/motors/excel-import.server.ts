import "server-only";

import * as XLSX from "xlsx";

import { ExcelSheetData } from "@/lib/motors/excel-types";

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

export function readExcelSheetsFromBuffer(buffer: Buffer): ExcelSheetData[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  return workbook.SheetNames.map((name) => {
    const worksheet = workbook.Sheets[name];
    return {
      name,
      rows: worksheet ? sheetRowsFromWorksheet(worksheet) : [],
    };
  }).filter((sheet) => sheet.rows.length > 0);
}
