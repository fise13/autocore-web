import { MotorEntity } from "@/domain/motor";

import { MotorImportPreviewRow } from "./types";
import { normalizeSerial } from "./preprocessor";

function conflictFields(existing: MotorEntity, row: MotorImportPreviewRow): string[] {
  const conflicts: string[] = [];
  if (existing.configuration && row.configuration && existing.configuration !== row.configuration) {
    conflicts.push("configuration");
  }
  if (existing.soldDate && row.soldDate) {
    const existingTime = existing.soldDate.getTime();
    const rowTime = row.soldDate.getTime();
    if (existingTime !== rowTime) conflicts.push("soldDate");
  }
  if (existing.brandName !== row.brandName) conflicts.push("brandName");
  if (existing.engineCode !== row.engineCode) conflicts.push("engineCode");
  return conflicts;
}

export function enrichMotorRowsWithDuplicates(
  rows: MotorImportPreviewRow[],
  existingMotors: MotorEntity[],
): MotorImportPreviewRow[] {
  const bySerial = new Map<string, MotorEntity>();
  for (const motor of existingMotors) {
    if (!motor.serialCode.trim()) continue;
    bySerial.set(normalizeSerial(motor.serialCode), motor);
  }

  return rows.map((row) => {
    const key = normalizeSerial(row.serialCode);
    const existing = key ? bySerial.get(key) : undefined;
    const duplicateReasons: string[] = [];
    let conflictList: string[] = [];

    if (existing) {
      duplicateReasons.push("Совпадение серийника");
      conflictList = conflictFields(existing, row);
    }

    const action = existing ? "update" : row.action === "skip" ? "skip" : "create";
    return {
      ...row,
      duplicateOfMotorId: existing?.id,
      duplicateReasons,
      conflictFields: conflictList,
      action,
      summary:
        row.errors.length > 0
          ? row.errors[0]
          : existing
            ? "Обновит существующий мотор"
            : "Создаст новый мотор",
      confidence: existing ? Math.min(row.confidence, 0.75) : row.confidence,
    };
  });
}

export function duplicateMotorRows(rows: MotorImportPreviewRow[]): MotorImportPreviewRow[] {
  return rows.filter((row) => Boolean(row.duplicateOfMotorId));
}
