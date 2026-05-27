export type GridViewport = {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
};

export function computeVisibleRange(params: {
  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  viewportWidth: number;
  rowHeight: number;
  headerHeight: number;
  rowCount: number;
  columnWidths: number[];
  bufferRows?: number;
  bufferCols?: number;
}): GridViewport {
  const {
    scrollTop,
    scrollLeft,
    viewportHeight,
    viewportWidth,
    rowHeight,
    headerHeight,
    rowCount,
    columnWidths,
    bufferRows = 2,
    bufferCols = 1,
  } = params;

  const bodyTop = Math.max(0, scrollTop - headerHeight);
  const startRow = Math.max(0, Math.floor(bodyTop / rowHeight) - bufferRows);
  const visibleRows = Math.ceil(viewportHeight / rowHeight) + bufferRows * 2;
  const endRow = Math.min(rowCount - 1, startRow + visibleRows);

  let colStart = 0;
  let cursorX = 0;
  while (colStart < columnWidths.length && cursorX + columnWidths[colStart] <= scrollLeft) {
    cursorX += columnWidths[colStart];
    colStart += 1;
  }
  colStart = Math.max(0, colStart - bufferCols);

  let colEnd = colStart;
  let visibleWidth = 0;
  while (colEnd < columnWidths.length && visibleWidth < viewportWidth + bufferCols * 200) {
    visibleWidth += columnWidths[colEnd];
    colEnd += 1;
  }
  colEnd = Math.max(colStart, Math.min(columnWidths.length - 1, colEnd));

  return {
    rowStart: startRow,
    rowEnd: endRow,
    colStart,
    colEnd,
  };
}
