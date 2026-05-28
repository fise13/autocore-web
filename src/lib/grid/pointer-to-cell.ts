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
  const rect = viewport.getBoundingClientRect();
  const x = clientX - rect.left + viewport.scrollLeft;
  const y = clientY - rect.top + viewport.scrollTop - headerHeight;
  const visualRow = Math.floor(y / rowHeight);
  if (visualRow < 0 || visualRow >= rowCount) return null;

  const row = mapRow ? mapRow(visualRow) : visualRow;
  if (row == null) return null;

  let column = 0;
  while (column < columns.length - 1 && xOffsets[column] + columns[column].width <= x) {
    column += 1;
  }

  return { row, column };
}
