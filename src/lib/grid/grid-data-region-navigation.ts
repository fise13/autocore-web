import { GridCellAddress, GridRange } from "@/lib/grid/grid-types";

export function findLastUsedCell(params: {
  rowCount: number;
  navigableColumns: number[];
  isEmpty: (row: number, column: number) => boolean;
}): GridCellAddress | null {
  const { rowCount, navigableColumns, isEmpty } = params;
  for (let row = rowCount - 1; row >= 0; row -= 1) {
    for (let i = navigableColumns.length - 1; i >= 0; i -= 1) {
      const column = navigableColumns[i];
      if (!isEmpty(row, column)) {
        return { row, column };
      }
    }
  }
  return null;
}

export function boundingDataRange(params: {
  rowCount: number;
  navigableColumns: number[];
  isEmpty: (row: number, column: number) => boolean;
}): GridRange | null {
  const { rowCount, navigableColumns, isEmpty } = params;
  let minRow = Number.POSITIVE_INFINITY;
  let maxRow = -1;
  let minColumn = Number.POSITIVE_INFINITY;
  let maxColumn = -1;
  for (let row = 0; row < rowCount; row += 1) {
    for (const column of navigableColumns) {
      if (!isEmpty(row, column)) {
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        minColumn = Math.min(minColumn, column);
        maxColumn = Math.max(maxColumn, column);
      }
    }
  }
  if (maxRow < 0 || maxColumn < 0) return null;
  return { minRow, maxRow, minColumn, maxColumn };
}

export function jumpColumnInRow(params: {
  row: number;
  fromColumn: number;
  direction: -1 | 1;
  navigableColumns: number[];
  isEmpty: (row: number, column: number) => boolean;
}): number {
  const { row, fromColumn, direction, navigableColumns, isEmpty } = params;
  const currentIndex = navigableColumns.indexOf(fromColumn);
  if (currentIndex < 0) return fromColumn;

  let idx = currentIndex + direction;
  while (idx >= 0 && idx < navigableColumns.length) {
    const col = navigableColumns[idx];
    if (!isEmpty(row, col)) return col;
    idx += direction;
  }
  return fromColumn;
}

export function jumpRowInColumn(params: {
  column: number;
  fromRow: number;
  direction: -1 | 1;
  rowCount: number;
  isEmpty: (row: number, column: number) => boolean;
}): number {
  const { column, fromRow, direction, rowCount, isEmpty } = params;
  let row = fromRow + direction;
  while (row >= 0 && row < rowCount) {
    if (!isEmpty(row, column)) return row;
    row += direction;
  }
  return fromRow;
}
