import { GridCellAddress, GridColumnDefinition } from "@/lib/grid/grid-types";

type ResolvePointerCellOptions = {
  clientX: number;
  clientY: number;
  viewport: HTMLElement;
  rowCount: number;
  rowHeight: number;
  headerHeight: number;
  columns: GridColumnDefinition[];
  xOffsets: number[];
  mapRow?: (row: number) => number | null;
};

function pointerContentCoords(
  clientX: number,
  clientY: number,
  viewport: HTMLElement,
  headerHeight: number,
): { x: number; y: number } {
  const rect = viewport.getBoundingClientRect();
  return {
    x: clientX - rect.left + viewport.scrollLeft,
    y: clientY - rect.top + viewport.scrollTop - headerHeight,
  };
}

function columnFromContentX(
  x: number,
  columns: GridColumnDefinition[],
  xOffsets: number[],
): number {
  let column = 0;
  while (column < columns.length - 1 && xOffsets[column] + columns[column].width <= x) {
    column += 1;
  }
  return column;
}

export function resolvePointerCell({
  clientX,
  clientY,
  viewport,
  rowCount,
  rowHeight,
  headerHeight,
  columns,
  xOffsets,
  mapRow,
}: ResolvePointerCellOptions): GridCellAddress | null {
  if (rowCount <= 0 || columns.length === 0) return null;

  const { x, y } = pointerContentCoords(clientX, clientY, viewport, headerHeight);
  const visualRow = Math.floor(y / rowHeight);
  if (visualRow < 0 || visualRow >= rowCount) return null;

  const row = mapRow ? mapRow(visualRow) : visualRow;
  if (row == null) return null;

  return { row, column: columnFromContentX(x, columns, xOffsets) };
}

/** Like resolvePointerCell, but clamps to grid edges so drag-select works at viewport borders. */
export function resolvePointerCellClamped({
  clientX,
  clientY,
  viewport,
  rowCount,
  rowHeight,
  headerHeight,
  columns,
  xOffsets,
  mapRow,
}: ResolvePointerCellOptions): GridCellAddress | null {
  if (rowCount <= 0 || columns.length === 0) return null;

  const rect = viewport.getBoundingClientRect();
  const { x, y } = pointerContentCoords(clientX, clientY, viewport, headerHeight);

  let visualRow = Math.floor(y / rowHeight);

  if (clientY >= rect.bottom - 1) {
    visualRow = Math.floor(
      (viewport.scrollTop + viewport.clientHeight - headerHeight - 1) / rowHeight,
    );
  } else if (clientY <= rect.top + headerHeight + 1) {
    visualRow = Math.floor(viewport.scrollTop / rowHeight);
  }

  visualRow = Math.max(0, Math.min(rowCount - 1, visualRow));

  const row = mapRow ? mapRow(visualRow) : visualRow;
  if (row == null) return null;

  let column = columnFromContentX(x, columns, xOffsets);
  if (clientX >= rect.right - 1) {
    column = columns.length - 1;
  } else if (clientX <= rect.left + 1) {
    column = 0;
  }
  column = Math.max(0, Math.min(columns.length - 1, column));

  return { row, column };
}
