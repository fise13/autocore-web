import { MotorImportPreviewRow } from "./types";

export function validateMotorPreviewRow(row: MotorImportPreviewRow): MotorImportPreviewRow {
  const errors = [...row.errors];
  const warnings = [...row.warnings];

  if (!row.serialCode.trim()) errors.push("Серийник обязателен");
  if (row.importType === "engines") {
    if (!row.brandName.trim() || row.brandName === "Не указан") warnings.push("Бренд не определён");
    if (!row.engineCode.trim() || row.engineCode === "—") warnings.push("Код двигателя не определён");
    if (row.soldDate && !row.arrivalDate) warnings.push("Есть дата продажи без даты прихода");
  }

  const confidence = Math.max(0.1, row.confidence - errors.length * 0.15);

  return {
    ...row,
    errors,
    warnings,
    confidence,
    selected: row.selected && errors.length === 0,
    action: errors.length > 0 ? "skip" : row.action,
  };
}

export function validateMotorPreviewRows(rows: MotorImportPreviewRow[]): MotorImportPreviewRow[] {
  return rows.map(validateMotorPreviewRow);
}
