import { GridCellAddress, GridRange } from "@/lib/grid/grid-types";

/** Strip Excel's trailing empty line from a clipboard TSV dump. */
export function parseClipboardTsv(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let lines = normalized.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines = lines.slice(0, -1);
  }
  if (lines.length === 0) return [];
  return lines.map((line) => line.split("\t"));
}

export function serializeRangeToTsv(
  range: GridRange,
  valueAt: (row: number, column: number) => string,
): string {
  const lines: string[] = [];
  for (let row = range.minRow; row <= range.maxRow; row += 1) {
    const cells: string[] = [];
    for (let column = range.minColumn; column <= range.maxColumn; column += 1) {
      cells.push(valueAt(row, column));
    }
    lines.push(cells.join("\t"));
  }
  return lines.join("\n");
}

/** Multi-range copy: sequential TSV blocks joined by a blank line. */
export function serializeRangesToTsv(
  ranges: GridRange[],
  valueAt: (row: number, column: number) => string,
): string {
  return ranges.map((range) => serializeRangeToTsv(range, valueAt)).join("\n\n");
}

export type PasteWrite = {
  row: number;
  column: number;
  value: string;
};

/**
 * Build paste writes.
 * - Single-cell (or selection smaller than clipboard): paste full matrix from selection top-left.
 * - Larger selection: tile clipboard to fill the selection.
 */
export function buildPasteWrites(params: {
  matrix: string[][];
  selection: GridRange;
  isEditableColumn: (column: number) => boolean;
}): { writes: PasteWrite[]; maxRow: number } {
  const { matrix, selection, isEditableColumn } = params;
  if (matrix.length === 0) return { writes: [], maxRow: selection.minRow };

  const clipRows = matrix.length;
  const clipCols = Math.max(0, ...matrix.map((row) => row.length));
  if (clipRows === 0 || clipCols === 0) {
    return { writes: [], maxRow: selection.minRow };
  }

  const selRows = selection.maxRow - selection.minRow + 1;
  const selCols = selection.maxColumn - selection.minColumn + 1;
  const tile =
    (selRows > clipRows || selCols > clipCols) &&
    !(selRows === 1 && selCols === 1);

  const targetRows = tile ? selRows : clipRows;
  const targetCols = tile ? selCols : clipCols;
  const writes: PasteWrite[] = [];

  for (let r = 0; r < targetRows; r += 1) {
    const row = selection.minRow + r;
    const sourceRow = matrix[r % clipRows] ?? [];
    for (let c = 0; c < targetCols; c += 1) {
      const column = selection.minColumn + c;
      if (!isEditableColumn(column)) continue;
      const value = sourceRow[c % clipCols] ?? "";
      writes.push({ row, column, value });
    }
  }

  return {
    writes,
    maxRow: selection.minRow + targetRows - 1,
  };
}

export function buildClearWrites(params: {
  ranges: GridRange[];
  valueAt: (row: number, column: number) => string;
  isEditableColumn: (column: number) => boolean;
  mapClearColumn?: (column: number) => number | null;
}): PasteWrite[] {
  const { ranges, valueAt, isEditableColumn, mapClearColumn } = params;
  const writes: PasteWrite[] = [];
  const seen = new Set<string>();

  for (const range of ranges) {
    for (let row = range.minRow; row <= range.maxRow; row += 1) {
      for (let column = range.minColumn; column <= range.maxColumn; column += 1) {
        const clearColumn = mapClearColumn ? mapClearColumn(column) : column;
        if (clearColumn == null) continue;
        if (!isEditableColumn(clearColumn)) continue;
        const key = `${row}:${clearColumn}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const current = valueAt(row, clearColumn);
        if (!current) continue;
        writes.push({ row, column: clearColumn, value: "" });
      }
    }
  }

  return writes;
}

export function buildFillDownWrites(params: {
  range: GridRange;
  valueAt: (row: number, column: number) => string;
  isEditableColumn: (column: number) => boolean;
}): PasteWrite[] {
  const { range, valueAt, isEditableColumn } = params;
  if (range.maxRow <= range.minRow) return [];
  const writes: PasteWrite[] = [];
  for (let column = range.minColumn; column <= range.maxColumn; column += 1) {
    if (!isEditableColumn(column)) continue;
    const source = valueAt(range.minRow, column);
    for (let row = range.minRow + 1; row <= range.maxRow; row += 1) {
      writes.push({ row, column, value: source });
    }
  }
  return writes;
}

export function buildFillRightWrites(params: {
  range: GridRange;
  valueAt: (row: number, column: number) => string;
  isEditableColumn: (column: number) => boolean;
}): PasteWrite[] {
  const { range, valueAt, isEditableColumn } = params;
  if (range.maxColumn <= range.minColumn) return [];
  const writes: PasteWrite[] = [];
  for (let row = range.minRow; row <= range.maxRow; row += 1) {
    const source = valueAt(row, range.minColumn);
    for (let column = range.minColumn + 1; column <= range.maxColumn; column += 1) {
      if (!isEditableColumn(column)) continue;
      writes.push({ row, column, value: source });
    }
  }
  return writes;
}

export function buildFillWithActiveWrites(params: {
  range: GridRange;
  active: GridCellAddress;
  valueAt: (row: number, column: number) => string;
  isEditableColumn: (column: number) => boolean;
}): PasteWrite[] {
  const { range, active, valueAt, isEditableColumn } = params;
  const seed = valueAt(active.row, active.column);
  const writes: PasteWrite[] = [];
  for (let row = range.minRow; row <= range.maxRow; row += 1) {
    for (let column = range.minColumn; column <= range.maxColumn; column += 1) {
      if (!isEditableColumn(column)) continue;
      if (row === active.row && column === active.column) continue;
      writes.push({ row, column, value: seed });
    }
  }
  return writes;
}

/**
 * Grid copy/paste goes through the platform adapter: `navigator.clipboard.readText()`
 * is unreliable in the desktop shell's WKWebView, and pasting a range is a core
 * workflow here. The browser behaviour, including the `execCommand` fallback, is
 * unchanged on web.
 */
export { readClipboardText, writeClipboardText } from "@/platform";
