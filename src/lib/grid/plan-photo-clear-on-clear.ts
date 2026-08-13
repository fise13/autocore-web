import { hasSaveableContent, type MotorGridRow } from "@/lib/grid/grid-data-store";
import type { GridRange } from "@/lib/grid/grid-types";

export type PhotoClearPlan = {
  rowIndexes: number[];
  urls: string[];
  photoCount: number;
};

/**
 * Rows whose non-photo content would be empty after a Clear, and that still have photos.
 * Clearing those photos is required so Save can soft-delete the row.
 */
export function planPhotoClearOnClear(params: {
  ranges: GridRange[];
  rows: MotorGridRow[];
  applyClearedValue: (row: MotorGridRow, column: number) => MotorGridRow;
  isEditableColumn: (column: number) => boolean;
}): PhotoClearPlan {
  const { ranges, rows, applyClearedValue, isEditableColumn } = params;
  const touched = new Set<number>();
  for (const range of ranges) {
    for (let row = range.minRow; row <= range.maxRow; row += 1) {
      touched.add(row);
    }
  }

  const rowIndexes: number[] = [];
  const urls: string[] = [];

  for (const rowIndex of [...touched].sort((a, b) => a - b)) {
    const row = rows[rowIndex];
    if (!row) continue;
    const photos = row.photoUrls ?? [];
    if (photos.length === 0) continue;

    let next: MotorGridRow = { ...row, photoUrls: [...photos] };
    for (const range of ranges) {
      if (rowIndex < range.minRow || rowIndex > range.maxRow) continue;
      for (let column = range.minColumn; column <= range.maxColumn; column += 1) {
        if (!isEditableColumn(column)) continue;
        next = applyClearedValue(next, column);
      }
    }

    if (!hasSaveableContent({ ...next, photoUrls: [] })) {
      rowIndexes.push(rowIndex);
      urls.push(...photos);
    }
  }

  return {
    rowIndexes,
    urls,
    photoCount: urls.length,
  };
}
