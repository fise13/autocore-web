export type PinnableColumn = {
  id: string;
  width: number;
};

export type PinnedColumnMetrics = {
  indexes: number[];
  lefts: Map<number, number>;
  lastIndex: number;
  totalWidth: number;
};

export function pinnedColumnMetrics(
  columns: readonly PinnableColumn[],
  pinnedIds: readonly string[],
): PinnedColumnMetrics {
  const wanted = new Set(pinnedIds);
  const indexes: number[] = [];
  const lefts = new Map<number, number>();
  let left = 0;
  for (let index = 0; index < columns.length; index += 1) {
    if (!wanted.has(columns[index].id)) continue;
    indexes.push(index);
    lefts.set(index, left);
    left += columns[index].width;
  }
  return {
    indexes,
    lefts,
    lastIndex: indexes.length > 0 ? indexes[indexes.length - 1] : -1,
    totalWidth: left,
  };
}

export function unionVisibleColumnIndexes(
  colStart: number,
  colEnd: number,
  pinnedIndexes: readonly number[],
  columnCount: number,
): number[] {
  const set = new Set<number>();
  const start = Math.max(0, colStart);
  const end = Math.min(columnCount - 1, colEnd);
  for (let index = start; index <= end; index += 1) set.add(index);
  for (const index of pinnedIndexes) {
    if (index >= 0 && index < columnCount) set.add(index);
  }
  return [...set].sort((a, b) => a - b);
}

export function stickyColumnLeft(
  columnIndex: number,
  xOffset: number,
  scrollLeft: number,
  pinnedLeft: number | undefined,
): number {
  if (pinnedLeft == null) return xOffset;
  return scrollLeft + pinnedLeft;
}
