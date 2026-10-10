import { MotorEntity } from "@/domain/motor";
import { nextEmptyRowId } from "@/lib/grid/empty-row-id";
import { MOTOR_GRID_EMPTY_ROWS_BASE, MOTOR_GRID_EMPTY_ROWS_EXPAND } from "@/lib/motor-grid-layout";

export type MotorGridRow = MotorEntity & {
  rowKind: "saved" | "empty";
  rowId: string;
};

export type MotorRowDefaults = {
  brandName?: string;
  engineCode?: string;
};

/**
 * Filler rows stay blank. The active brand/model filter is applied only when a row is
 * actually saved (see applyRowDefaults) — pre-filling every blank row made the grid look
 * like 20 duplicate motors and turned untouched rows into half-filled drafts.
 */
export function createEmptyRow(companyId: string): MotorGridRow {
  const rowId = nextEmptyRowId();
  return {
    rowKind: "empty",
    rowId,
    id: rowId,
    companyId,
    serialCode: "",
    configuration: "",
    notes: "",
    quality: "",
    photoUrls: [],
    quantity: 1,
    transmission: "",
    arrivalDate: null,
    soldDate: null,
    brandName: "",
    engineCode: "",
  };
}

/** Fill brand/model the user left blank from the active sidebar filter. */
export function applyRowDefaults<T extends MotorGridRow>(row: T, defaults?: MotorRowDefaults): T {
  const brandName = row.brandName?.trim() || defaults?.brandName?.trim() || "";
  const engineCode = row.engineCode?.trim() || defaults?.engineCode?.trim() || "";
  if (brandName === (row.brandName ?? "") && engineCode === (row.engineCode ?? "")) return row;
  return { ...row, brandName, engineCode };
}

export function buildGridRows(
  motors: MotorEntity[],
  companyId: string,
  targetCount?: number,
): MotorGridRow[] {
  const seenIds = new Set<string>();
  const uniqueMotors = motors.filter((motor) => {
    if (seenIds.has(motor.id)) return false;
    seenIds.add(motor.id);
    return true;
  });

  const rows: MotorGridRow[] = uniqueMotors.map((motor) => ({
    ...motor,
    rowKind: "saved",
    rowId: `saved-${motor.id}`,
  }));
  const goal = Math.max(targetCount ?? MOTOR_GRID_EMPTY_ROWS_BASE, rows.length, MOTOR_GRID_EMPTY_ROWS_BASE);
  const fillers = goal - rows.length;
  for (let i = 0; i < fillers; i += 1) {
    rows.push(createEmptyRow(companyId));
  }
  return rows;
}

export function growRows(
  current: MotorGridRow[],
  companyId: string,
  amount = MOTOR_GRID_EMPTY_ROWS_EXPAND,
): MotorGridRow[] {
  const next = [...current];
  for (let i = 0; i < amount; i += 1) {
    next.push(createEmptyRow(companyId));
  }
  return next;
}

export function hasSaveableContent(row: MotorGridRow): boolean {
  return (
    row.serialCode.trim().length > 0 ||
    row.configuration.trim().length > 0 ||
    row.notes.trim().length > 0 ||
    (row.quality?.trim().length ?? 0) > 0 ||
    (row.photoUrls?.length ?? 0) > 0 ||
    (row.brandName?.trim().length ?? 0) > 0 ||
    (row.engineCode?.trim().length ?? 0) > 0 ||
    row.quantity > 1 ||
    row.transmission.trim().length > 0 ||
    Boolean(row.warehouseLocation?.trim()) ||
    Boolean(row.primaryLocationCode?.trim())
  );
}

export function buildSavedMotorRowFromCreate(
  row: MotorGridRow & { rowKind: "empty" },
  motorId: string,
  companyId: string,
): MotorGridRow & { rowKind: "saved" } {
  const parsedLocalId = Number(motorId);
  return {
    id: motorId,
    companyId,
    localId: Number.isFinite(parsedLocalId) ? parsedLocalId : undefined,
    serialCode: row.serialCode.trim(),
    configuration: row.configuration,
    notes: row.notes,
    quality: row.quality ?? "",
    photoUrls: row.photoUrls ?? [],
    quantity: row.quantity,
    transmission: row.transmission,
    arrivalDate: row.arrivalDate ?? new Date(),
    soldDate: row.soldDate,
    brandName: row.brandName,
    engineCode: row.engineCode,
    rowKind: "saved",
    rowId: `saved-${motorId}`,
  };
}

export function rowFieldValueByModelField(row: MotorGridRow, field: string | undefined): string {
  switch (field) {
    case "brandName":
      return row.brandName ?? "";
    case "engineCode":
      return row.engineCode ?? "";
    case "serialCode":
      return row.serialCode ?? "";
    case "configuration":
      return row.configuration ?? "";
    case "notes":
      return row.notes ?? "";
    case "quality":
      return row.quality ?? "";
    case "photoUrls":
      return (row.photoUrls ?? []).join("\n");
    case "quantity":
      return String(row.quantity ?? 1);
    case "transmission":
      return row.transmission ?? "";
    case "warehouseLocation":
      return row.primaryLocationCode?.trim() || row.warehouseLocation?.trim() || "";
    case "arrivalDate":
      return row.arrivalDate ? row.arrivalDate.toISOString().slice(0, 10) : "";
    case "soldDate":
      return row.soldDate ? row.soldDate.toISOString().slice(0, 10) : "";
    default:
      return "";
  }
}

export function rowFieldValue(row: MotorGridRow, columnIndex: number): string {
  switch (columnIndex) {
    case 1:
      return row.brandName ?? "";
    case 2:
      return row.engineCode ?? "";
    case 3:
      return row.serialCode ?? "";
    case 4:
      return row.configuration ?? "";
    case 5:
      return row.notes ?? "";
    case 6:
      return String(row.quantity ?? 1);
    case 7:
      return row.transmission ?? "";
    case 8:
      return row.arrivalDate ? row.arrivalDate.toISOString().slice(0, 10) : "";
    case 9:
      return row.soldDate ? row.soldDate.toISOString().slice(0, 10) : "";
    default:
      return "";
  }
}
