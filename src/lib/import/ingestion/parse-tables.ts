/**
 * Spreadsheet and delimited-text parsing.
 *
 * Reuses the battle-tested warehouse preprocessor (cell cleaning, header
 * detection, dedupe, empty-row pruning) so ingestion behaves identically to the
 * existing import paths, then emits the unified {@link ParsedTable} shape.
 */

import * as XLSX from "xlsx";

import {
  cleanCell,
  dedupeHeaders,
  detectHeaderRowIndex,
  isEmptyRow,
  preprocessRows,
} from "@/lib/warehouse/import/preprocessor";

import type { ParsedTable } from "../types";
import type { SourceFile } from "./types";

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    const d = String(value.getDate()).padStart(2, "0");
    const m = String(value.getMonth() + 1).padStart(2, "0");
    return `${d}.${m}.${value.getFullYear()}`;
  }
  return cleanCell(String(value));
}

function tableFromMatrix(name: string, matrix: string[][], sourceFile?: string): ParsedTable {
  const parseWarnings: string[] = [];
  if (matrix.length === 0) {
    return { name, headers: [], rows: [], parseWarnings: ["Пустой лист"], sourceFile };
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

  const processed = preprocessRows(rows);
  parseWarnings.push(...processed.warnings);
  return { name, headers, rows: processed.rows, parseWarnings, sourceFile };
}

/** Parse an .xlsx/.xls/.xlsm workbook into one {@link ParsedTable} per sheet. */
export function parseWorkbook(file: SourceFile): ParsedTable[] {
  const workbook = XLSX.read(file.bytes, { type: "array", cellDates: true });
  return workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return { name: sheetName, headers: [], rows: [], parseWarnings: ["Пустой лист"], sourceFile: file.name };
    }
    const matrix = XLSX.utils
      .sheet_to_json<(string | number | boolean | Date | null)[]>(worksheet, {
        header: 1,
        raw: false,
        defval: "",
      })
      .map((row) => row.map(cellToString));
    return tableFromMatrix(sheetName, matrix, file.name);
  }).filter((table) => table.headers.length > 0 || table.rows.length > 0);
}

/** Split a CSV/TSV line respecting quotes. */
function splitDelimited(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current);
  return out.map((cell) => cleanCell(cell));
}

function detectDelimiter(sample: string): string {
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = (sample.match(new RegExp(`\\${candidate}`, "g")) ?? []).length;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/** Decode bytes as UTF-8 (with BOM stripping) into text. */
function decodeText(bytes: ArrayBuffer): string {
  const text = new TextDecoder("utf-8").decode(bytes);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Parse a CSV/TSV/TXT file into a single {@link ParsedTable}. */
export function parseDelimitedText(file: SourceFile): ParsedTable {
  const text = decodeText(file.bytes);
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { name: file.name, headers: [], rows: [], parseWarnings: ["Пустой файл"], sourceFile: file.name };
  }
  const delimiter = file.extension === "tsv" ? "\t" : detectDelimiter(lines[0]);
  const matrix = lines.map((line) => splitDelimited(line, delimiter));
  return tableFromMatrix(file.name, matrix, file.name);
}
