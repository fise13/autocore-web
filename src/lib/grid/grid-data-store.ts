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

export function createEmptyRow(companyId: string, defaults?: MotorRowDefaults): MotorGridRow {
  const rowId = nextEmptyRowId();
  return {
    rowKind: "empty",
    rowId,
    id: rowId,
    companyId,
    serialCode: "",
    configuration: "",
    notes: "",
    quantity: 1,
    transmission: "",
    arrivalDate: null,
    soldDate: null,
    brandName: defaults?.brandName?.trim() ?? "",
    engineCode: defaults?.engineCode?.trim() ?? "",
  };
}

export function buildGridRows(
  motors: MotorEntity[],
  companyId: string,
  targetCount?: number,
  defaults?: MotorRowDefaults,
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
    rows.push(createEmptyRow(companyId, defaults));
  }
  return rows;
}

export function growRows(
  current: MotorGridRow[],
  companyId: string,
  amount = MOTOR_GRID_EMPTY_ROWS_EXPAND,
  defaults?: MotorRowDefaults,
): MotorGridRow[] {
  const next = [...current];
  for (let i = 0; i < amount; i += 1) {
    next.push(createEmptyRow(companyId, defaults));
  }
  return next;
}

export function hasSaveableContent(row: MotorGridRow): boolean {
  return (
    row.serialCode.trim().length > 0 ||
    row.configuration.trim().length > 0 ||
    row.notes.trim().length > 0 ||
    (row.brandName?.trim().length ?? 0) > 0 ||
    (row.engineCode?.trim().length ?? 0) > 0 ||
    row.quantity > 1 ||
    row.transmission.trim().length > 0
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
    case "quantity":
      return String(row.quantity ?? 1);
    case "transmission":
      return row.transmission ?? "";
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
