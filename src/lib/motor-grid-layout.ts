import type { GridColumnFitHint } from "@/lib/grid/grid-density";

/** Content-optimal column widths (before density scale + zoom). */
export const MOTOR_GRID_COLUMN_WIDTHS = {
  rowNumber: 44,
  brandName: 100,
  engineCode: 110,
  serialCode: 130,
  configuration: 140,
  notes: 160,
  quality: 80,
  photo: 90,
  quantity: 60,
  transmission: 120,
  warehouseLocation: 140,
  arrivalDate: 120,
  soldDate: 110,
  action: 88,
} as const;

/**
 * Semantic fit: fixed / semi-fixed stay dense; Configuration + Notes fill leftover.
 */
export const MOTOR_GRID_COLUMN_FIT: {
  readonly [K in keyof typeof MOTOR_GRID_COLUMN_WIDTHS]: GridColumnFitHint;
} = {
  rowNumber: { flex: 0, minWidth: 36, maxWidth: 52, role: "fixed" },
  brandName: { flex: 0.25, minWidth: 84, maxWidth: 124, role: "semi" },
  engineCode: { flex: 0.25, minWidth: 92, maxWidth: 132, role: "semi" },
  serialCode: { flex: 0.4, minWidth: 110, maxWidth: 180, role: "semi" },
  configuration: {
    flex: 1.35,
    minWidth: 120,
    maxWidth: Number.POSITIVE_INFINITY,
    role: "flex",
  },
  notes: {
    flex: 1.85,
    minWidth: 140,
    maxWidth: Number.POSITIVE_INFINITY,
    role: "flex",
  },
  quality: { flex: 0, minWidth: 64, maxWidth: 92, role: "fixed" },
  photo: { flex: 0.15, minWidth: 76, maxWidth: 112, role: "semi" },
  quantity: { flex: 0, minWidth: 52, maxWidth: 68, role: "fixed" },
  transmission: { flex: 0.3, minWidth: 100, maxWidth: 148, role: "semi" },
  warehouseLocation: { flex: 0.45, minWidth: 112, maxWidth: 184, role: "semi" },
  arrivalDate: { flex: 0.2, minWidth: 100, maxWidth: 140, role: "semi" },
  soldDate: { flex: 0.2, minWidth: 92, maxWidth: 132, role: "semi" },
  action: { flex: 0, minWidth: 76, maxWidth: 104, role: "fixed" },
};

export const MOTOR_GRID_PINNED_COLUMN_IDS = ["rowNumber", "brandName", "engineCode"] as const;

export const MOTOR_GRID_BASE_ROW_HEIGHT = 30;
export const MOTOR_GRID_BASE_HEADER_HEIGHT = 28;

export const MOTOR_GRID_EMPTY_ROWS_BASE = 120;
export const MOTOR_GRID_EMPTY_ROWS_EXPAND = 120;
export const MOTOR_GRID_EMPTY_ROWS_THRESHOLD = 48;

export function scaleMotorGridDimension(base: number, zoom: number) {
  return Math.max(1, Math.round(base * zoom));
}
