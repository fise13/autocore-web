import { clampExcelColumnWidth, MAX_EXCEL_COLUMN_WIDTH, MIN_EXCEL_COLUMN_WIDTH } from "@/lib/grid/column-resize";

export const MOTOR_GRID_COLUMN_WIDTHS_STORAGE_KEY = "autocore.excel-grid.widths.motors.v1";
export const WAREHOUSE_GRID_COLUMN_WIDTHS_STORAGE_KEY = "autocore.excel-grid.widths.warehouse.v1";
export const SPECIFIC_GRID_COLUMN_WIDTHS_STORAGE_KEY = "autocore.excel-grid.widths.specific.v1";

export function readStoredColumnWidths(storageKey: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!id || typeof value !== "number" || !Number.isFinite(value)) continue;
      result[id] = clampExcelColumnWidth(value, MIN_EXCEL_COLUMN_WIDTH, MAX_EXCEL_COLUMN_WIDTH);
    }
    return result;
  } catch {
    return {};
  }
}

export function writeStoredColumnWidths(storageKey: string, widths: Readonly<Record<string, number>>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(widths));
  } catch {
    // Quota / private mode — widths still live in session state.
  }
}
