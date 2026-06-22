import { toDateFromFirestore } from "@/lib/firestore-timestamp";

import { prepareMagicImportRow } from "./import-row-integrity";
import { MotorImportPreviewRow } from "./types";

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  const parsed = toDateFromFirestore(value);
  return parsed && Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function normalizeImportEngineRow(
  row: MotorImportPreviewRow,
  options?: { magicImport?: boolean },
): MotorImportPreviewRow {
  const errors = Array.isArray(row.errors) ? row.errors : [];

  const normalized: MotorImportPreviewRow = {
    ...row,
    serialCode: String(row.serialCode ?? ""),
    brandName: String(row.brandName ?? ""),
    engineCode: String(row.engineCode ?? ""),
    configuration: String(row.configuration ?? ""),
    notes: String(row.notes ?? ""),
    transmission: String(row.transmission ?? ""),
    sheetConfigId: String(row.sheetConfigId ?? ""),
    rowKey: String(row.rowKey ?? ""),
    errors,
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    arrivalDate: toDate(row.arrivalDate),
    soldDate: toDate(row.soldDate),
    selected: row.selected !== false,
  };

  if (options?.magicImport !== false) {
    return prepareMagicImportRow(normalized);
  }

  const hasSerial = Boolean(normalized.serialCode.trim());
  return {
    ...normalized,
    selected: normalized.selected && hasSerial && errors.length === 0,
  };
}

export function normalizeImportEngineRows(
  rows: MotorImportPreviewRow[],
  options?: { magicImport?: boolean },
): MotorImportPreviewRow[] {
  return rows.map((row) => normalizeImportEngineRow(row, options));
}
