/** macOS GridLayoutEngine column widths (before zoom). */
export const MOTOR_GRID_COLUMN_WIDTHS = {
  rowNumber: 40,
  serialCode: 180,
  configuration: 180,
  notes: 220,
  quantity: 80,
  transmission: 120,
  arrivalDate: 140,
  soldDate: 140,
  action: 110,
} as const;

export const MOTOR_GRID_BASE_ROW_HEIGHT = 30;
export const MOTOR_GRID_BASE_HEADER_HEIGHT = 28;

export const MOTOR_GRID_EMPTY_ROWS_BASE = 120;
export const MOTOR_GRID_EMPTY_ROWS_EXPAND = 120;
export const MOTOR_GRID_EMPTY_ROWS_THRESHOLD = 48;

export function scaleMotorGridDimension(base: number, zoom: number) {
  return Math.max(1, Math.round(base * zoom));
}
