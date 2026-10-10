/**
 * WAI-ARIA grid helpers for the virtualised Excel grids.
 *
 * Cells are absolutely positioned (and pinned cells live in a separate sticky
 * layer), so rows claim their cells with `aria-owns` and the focus container
 * points at the active cell with `aria-activedescendant`. Indexes are 1-based;
 * row 1 is the header row.
 */
export function gridCellDomId(gridId: string, row: number, column: number): string {
  return `${gridId}-r${row}-c${column}`;
}

export function gridAriaRowIndex(dataRowIndex: number): number {
  return dataRowIndex + 2;
}

export function gridAriaColIndex(columnIndex: number): number {
  return columnIndex + 1;
}
