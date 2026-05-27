import { MotorEntity } from "@/domain/motor";
import { nextEmptyRowId } from "@/lib/grid/empty-row-id";
import { MOTOR_GRID_EMPTY_ROWS_BASE, MOTOR_GRID_EMPTY_ROWS_EXPAND } from "@/lib/motor-grid-layout";

export type MotorGridRow = MotorEntity & {
  rowKind: "saved" | "empty";
  rowId: string;
};

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
    quantity: 1,
    transmission: "",
    arrivalDate: null,
    soldDate: null,
    brandName: "",
    engineCode: "",
  };
}

export function buildGridRows(motors: MotorEntity[], companyId: string, targetCount?: number): MotorGridRow[] {
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

export function growRows(current: MotorGridRow[], companyId: string, amount = MOTOR_GRID_EMPTY_ROWS_EXPAND): MotorGridRow[] {
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
    row.quantity > 1 ||
    row.transmission.trim().length > 0
  );
}

export function rowFieldValue(row: MotorGridRow, columnIndex: number): string {
  switch (columnIndex) {
    case 1:
      return row.serialCode ?? "";
    case 2:
      return row.configuration ?? "";
    case 3:
      return row.notes ?? "";
    case 4:
      return String(row.quantity ?? 1);
    case 5:
      return row.transmission ?? "";
    case 6:
      return row.arrivalDate ? row.arrivalDate.toISOString().slice(0, 10) : "";
    case 7:
      return row.soldDate ? row.soldDate.toISOString().slice(0, 10) : "";
    default:
      return "";
  }
}
