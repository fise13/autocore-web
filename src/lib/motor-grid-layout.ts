import type { GridColumnFitHint } from "@/lib/grid/grid-density";

/** Content-optimal column widths (before density scale + zoom). */
export const MOTOR_GRID_COLUMN_WIDTHS = {
  rowNumber: 44,
  brandName: 112,
  engineCode: 104,
  serialCode: 152,
  configuration: 148,
  notes: 168,
  quality: 92,
  photo: 96,
  quantity: 64,
  transmission: 108,
  warehouseLocation: 120,
  arrivalDate: 118,
  soldDate: 118,
  action: 104,
} as const;

/**
 * Flex + max caps for monitor fit.
 * Fixed columns (qty, photo, #, action) never absorb leftover space.
 */
export const MOTOR_GRID_COLUMN_FIT: {
  readonly [K in keyof typeof MOTOR_GRID_COLUMN_WIDTHS]: GridColumnFitHint;
} = {
  rowNumber: { flex: 0, maxWidth: 48 },
  brandName: { flex: 1.1, maxWidth: 148 },
  engineCode: { flex: 1, maxWidth: 136 },
  serialCode: { flex: 1.45, maxWidth: 200 },
  configuration: { flex: 1.35, maxWidth: 200 },
  notes: { flex: 1.7, maxWidth: 240 },
  quality: { flex: 0.35, maxWidth: 112 },
  photo: { flex: 0, maxWidth: 96 },
  quantity: { flex: 0, maxWidth: 64 },
  transmission: { flex: 0.75, maxWidth: 132 },
  warehouseLocation: { flex: 0.85, maxWidth: 152 },
  arrivalDate: { flex: 0.4, maxWidth: 132 },
  soldDate: { flex: 0.4, maxWidth: 132 },
  action: { flex: 0, maxWidth: 104 },
};

export const MOTOR_GRID_BASE_ROW_HEIGHT = 30;
export const MOTOR_GRID_BASE_HEADER_HEIGHT = 28;

export const MOTOR_GRID_EMPTY_ROWS_BASE = 120;
export const MOTOR_GRID_EMPTY_ROWS_EXPAND = 120;
export const MOTOR_GRID_EMPTY_ROWS_THRESHOLD = 48;

export function scaleMotorGridDimension(base: number, zoom: number) {
  return Math.max(1, Math.round(base * zoom));
}
