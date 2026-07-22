import { GridCellAddress, GridRange } from "@/lib/grid/grid-types";

function parseDecimal(value: string): number | null {
  const cleaned = value.trim().replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDecimal(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function splitTextNumber(raw: string): { prefix: string; number: number } | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.*?)(-?\d+(?:[.,]\d+)?)$/);
  if (!match) return null;
  const number = parseDecimal(match[2]);
  if (number == null) return null;
  return { prefix: match[1], number };
}

function modIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

/** Sequence index may be negative when filling up/left. */
export function sequenceValue(index: number, sourceValues: string[], isDateColumn: boolean): string {
  if (sourceValues.length === 0) return "";
  if (sourceValues.length === 1) return sourceValues[0];

  const numeric = sourceValues.map(parseDecimal);
  if (numeric.every((x) => x != null)) {
    const nums = numeric as number[];
    const step = nums[1] - nums[0];
    return formatDecimal(nums[0] + step * index);
  }

  if (isDateColumn) {
    const dates = sourceValues.map(parseDate);
    if (dates.every((x) => x != null)) {
      const ds = dates as Date[];
      const dayMs = 24 * 60 * 60 * 1000;
      const step = Math.round((ds[1].getTime() - ds[0].getTime()) / dayMs);
      const next = new Date(ds[0].getTime() + step * index * dayMs);
      return formatDate(next);
    }
  }

  const first = splitTextNumber(sourceValues[0]);
  const second = splitTextNumber(sourceValues[1]);
  if (first && second && first.prefix.toLowerCase() === second.prefix.toLowerCase()) {
    const step = second.number - first.number;
    return `${first.prefix}${formatDecimal(first.number + step * index)}`;
  }

  return sourceValues[modIndex(index, sourceValues.length)];
}

/** Expand fill preview to include the source range and the drag cell (any direction). */
export function resolveFillDragTarget(source: GridRange, cell: GridCellAddress): GridRange {
  return {
    minRow: Math.min(source.minRow, cell.row),
    maxRow: Math.max(source.maxRow, cell.row),
    minColumn: Math.min(source.minColumn, cell.column),
    maxColumn: Math.max(source.maxColumn, cell.column),
  };
}

function isInsideRange(row: number, column: number, range: GridRange): boolean {
  return (
    row >= range.minRow &&
    row <= range.maxRow &&
    column >= range.minColumn &&
    column <= range.maxColumn
  );
}

export function buildFillOperations(params: {
  source: GridRange;
  target: GridRange;
  valueAt: (cell: GridCellAddress) => string;
  isEditableColumn: (column: number) => boolean;
  isDateColumn: (column: number) => boolean;
}): Array<{ cell: GridCellAddress; value: string }> {
  const { source, target, valueAt, isEditableColumn, isDateColumn } = params;
  const operations: Array<{ cell: GridCellAddress; value: string }> = [];

  const verticalSourceByColumn = new Map<number, string[]>();
  for (let column = source.minColumn; column <= source.maxColumn; column += 1) {
    const values: string[] = [];
    for (let row = source.minRow; row <= source.maxRow; row += 1) {
      values.push(valueAt({ row, column }));
    }
    verticalSourceByColumn.set(column, values);
  }

  const horizontalSourceByRow = new Map<number, string[]>();
  for (let row = source.minRow; row <= source.maxRow; row += 1) {
    const values: string[] = [];
    for (let column = source.minColumn; column <= source.maxColumn; column += 1) {
      values.push(valueAt({ row, column }));
    }
    horizontalSourceByRow.set(row, values);
  }

  // Anchor column/row series used for corner cells outside the source cross.
  const anchorColumnValues = verticalSourceByColumn.get(source.minColumn) ?? [];
  const anchorRowValues = horizontalSourceByRow.get(source.minRow) ?? [];

  for (let row = target.minRow; row <= target.maxRow; row += 1) {
    for (let column = target.minColumn; column <= target.maxColumn; column += 1) {
      if (!isEditableColumn(column)) continue;
      if (isInsideRange(row, column, source)) continue;

      const inSourceColumn = column >= source.minColumn && column <= source.maxColumn;
      const inSourceRow = row >= source.minRow && row <= source.maxRow;

      let value = "";
      if (inSourceColumn) {
        const sourceValues = verticalSourceByColumn.get(column) ?? [];
        value = sequenceValue(row - source.minRow, sourceValues, isDateColumn(column));
      } else if (inSourceRow) {
        const sourceValues = horizontalSourceByRow.get(row) ?? [];
        value = sequenceValue(column - source.minColumn, sourceValues, isDateColumn(column));
      } else {
        // Corner: extrapolate using the anchor column's vertical series (Excel-like).
        value =
          anchorColumnValues.length > 0
            ? sequenceValue(row - source.minRow, anchorColumnValues, isDateColumn(column))
            : sequenceValue(column - source.minColumn, anchorRowValues, isDateColumn(column));
      }

      operations.push({ cell: { row, column }, value });
    }
  }

  return operations;
}
