import { MotorImportPreviewRow } from "./types";

export function isMeaningfulImportRow(row: MotorImportPreviewRow): boolean {
  return Boolean(
    row.serialCode?.trim() ||
      row.configuration?.trim() ||
      row.notes?.trim() ||
      row.transmission?.trim() ||
      row.brandName?.trim() ||
      row.engineCode?.trim(),
  );
}

export function resolveImportSerial(row: MotorImportPreviewRow): {
  serialCode: string;
  notes: string;
  warnings: string[];
} {
  const trimmed = row.serialCode?.trim() ?? "";
  if (trimmed) {
    return { serialCode: trimmed, notes: row.notes ?? "", warnings: [] };
  }

  const safeSheet = row.sheetName.replace(/\s+/g, "-").slice(0, 24);
  const fallback = `AUTO-${safeSheet}-${row.rowIndex}`.slice(0, 64);
  return {
    serialCode: fallback,
    notes: row.notes?.trim()
      ? `${row.notes.trim()} · [импорт без серийника]`
      : "[импорт без серийника]",
    warnings: ["Серийник не распознан — присвоен временный номер, проверьте вручную"],
  };
}

/**
 * Magic Import: preserve every meaningful Excel row. AI may normalize fields but must not drop data.
 * Blocking errors become warnings; rows stay selected for import unless completely empty.
 */
export function prepareMagicImportRow(row: MotorImportPreviewRow): MotorImportPreviewRow {
  if (!isMeaningfulImportRow(row)) {
    return {
      ...row,
      selected: false,
      action: "skip",
      summary: "Пустая строка",
    };
  }

  const warnings = [
    ...row.warnings,
    ...row.errors.filter((error) => error !== "Серийник обязателен"),
  ];

  let serialCode = row.serialCode;
  let notes = row.notes;

  if (!serialCode.trim()) {
    const resolved = resolveImportSerial(row);
    serialCode = resolved.serialCode;
    notes = resolved.notes;
    warnings.push(...resolved.warnings);
  }

  const uncertain = row.aiMeta?.warnings.some((warning) => warning.includes("не уверен"));
  if (uncertain) {
    warnings.push("ИИ не уверен — проверьте строку после импорта");
  }

  const uniqueWarnings = [...new Set(warnings.filter(Boolean))];
  const action = row.duplicateOfMotorId ? "update" : "create";

  return {
    ...row,
    serialCode,
    notes,
    errors: [],
    warnings: uniqueWarnings,
    selected: true,
    action,
    summary:
      row.duplicateOfMotorId
        ? "Обновит существующий мотор"
        : uncertain
          ? "Создаст · проверьте после импорта"
          : uniqueWarnings.length > 0
            ? "Создаст с предупреждениями"
            : row.soldDate
              ? "Создаст · продан"
              : "Создаст новый мотор",
  };
}

export function prepareMagicImportRowsForCommit(rows: MotorImportPreviewRow[]): MotorImportPreviewRow[] {
  return rows.map(prepareMagicImportRow);
}

export function countMagicImportRowsReady(rows: MotorImportPreviewRow[]): number {
  return prepareMagicImportRowsForCommit(rows).filter((row) => row.selected).length;
}
