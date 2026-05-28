import * as XLSX from "xlsx";

import { parseCsvText } from "@/lib/warehouse/import-rules-engine";

import {
  cleanCell,
  dedupeHeaders,
  detectHeaderRowIndex,
  isEmptyRow,
  preprocessRows,
} from "./preprocessor";
import { ParsedImportSheet } from "./types";

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    const d = String(value.getDate()).padStart(2, "0");
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const y = value.getFullYear();
    return `${d}.${m}.${y}`;
  }
  return cleanCell(String(value));
}

function matrixFromWorksheet(worksheet: XLSX.WorkSheet): string[][] {
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  return matrix.map((row) => row.map((cell) => cellToString(cell)));
}

function rowsFromMatrix(matrix: string[][], parseWarnings: string[]): Omit<ParsedImportSheet, "sheetName"> {
  if (matrix.length === 0) {
    return { headers: [], rows: [], parseWarnings };
  }

  const headerRowIndex = detectHeaderRowIndex(matrix);
  const rawHeaders = matrix[headerRowIndex] ?? [];
  const headers = dedupeHeaders(rawHeaders.map((header) => header || "column"));
  const rows: Record<string, string>[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const cells = matrix[rowIndex] ?? [];
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    if (!isEmptyRow(row)) rows.push(row);
  }

  const preprocessed = preprocessRows(rows);
  if (preprocessed.warnings.length > 0) {
    parseWarnings.push(...preprocessed.warnings);
  }

  return {
    headers,
    rows: preprocessed.rows,
    parseWarnings,
  };
}

export async function readWarehouseSpreadsheet(file: File): Promise<ParsedImportSheet[]> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (extension === "csv" || extension === "tsv" || extension === "txt") {
    const text = await file.text();
    const parsed = parseCsvText(text);
    const preprocessed = preprocessRows(parsed.rows);
    return [
      {
        sheetName: file.name,
        headers: dedupeHeaders(parsed.headers),
        rows: preprocessed.rows,
        parseWarnings: preprocessed.warnings,
      },
    ];
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  return workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const parseWarnings: string[] = [];
    if (!worksheet) {
      return { sheetName, headers: [], rows: [], parseWarnings: ["Пустой лист"] };
    }
    const matrix = matrixFromWorksheet(worksheet);
    const parsed = rowsFromMatrix(matrix, parseWarnings);
    return { sheetName, ...parsed };
  }).filter((sheet) => sheet.headers.length > 0 || sheet.rows.length > 0);
}

export function pickDefaultSheet(sheets: ParsedImportSheet[]): ParsedImportSheet | null {
  if (sheets.length === 0) return null;
  return sheets.reduce((best, sheet) => (sheet.rows.length > best.rows.length ? sheet : best), sheets[0]);
}
