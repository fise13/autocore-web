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

function sequenceValue(index: number, sourceValues: string[], isDateColumn: boolean): string {
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

  return sourceValues[index % sourceValues.length];
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

  for (let column = source.minColumn; column <= target.maxColumn; column += 1) {
    if (!isEditableColumn(column)) continue;
    const sourceValues: string[] = [];
    for (let row = source.minRow; row <= source.maxRow; row += 1) {
      sourceValues.push(valueAt({ row, column }));
    }

    for (let row = source.minRow; row <= target.maxRow; row += 1) {
      if (row >= source.minRow && row <= source.maxRow && column >= source.minColumn && column <= source.maxColumn) {
        continue;
      }
      const sequenceIndex = row - source.minRow;
      operations.push({
        cell: { row, column },
        value: sequenceValue(sequenceIndex, sourceValues, isDateColumn(column)),
      });
    }
  }

  return operations;
}
