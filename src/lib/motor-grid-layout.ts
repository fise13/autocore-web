/** macOS GridLayoutEngine column widths (before zoom). */
export const MOTOR_GRID_COLUMN_WIDTHS = {
  rowNumber: 40,
  brandName: 128,
  engineCode: 116,
  serialCode: 196,
  configuration: 188,
  notes: 228,
  quantity: 72,
  transmission: 124,
  arrivalDate: 132,
  soldDate: 132,
  action: 110,
} as const;

export const MOTOR_GRID_BASE_ROW_HEIGHT = 32;
export const MOTOR_GRID_BASE_HEADER_HEIGHT = 30;

export const MOTOR_GRID_EMPTY_ROWS_BASE = 120;
export const MOTOR_GRID_EMPTY_ROWS_EXPAND = 120;
export const MOTOR_GRID_EMPTY_ROWS_THRESHOLD = 48;

export function scaleMotorGridDimension(base: number, zoom: number) {
  return Math.max(1, Math.round(base * zoom));
}
