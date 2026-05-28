import {
  GridCellAddress,
  GridRange,
  isCellInsideRange,
  makeSingleCellRange,
  normalizeRange,
} from "@/lib/grid/grid-types";

export type GridSelectionState = {
  anchor: GridCellAddress;
  head: GridCellAddress;
  cmdRanges: GridRange[];
};

export function initialSelection(): GridSelectionState {
  return {
    anchor: { row: 0, column: 1 },
    head: { row: 0, column: 1 },
    cmdRanges: [],
  };
}

export function primaryRange(selection: GridSelectionState): GridRange {
  return normalizeRange(selection.anchor, selection.head);
}

export function allRanges(selection: GridSelectionState): GridRange[] {
  return [primaryRange(selection), ...selection.cmdRanges];
}

export function clickSelection(
  current: GridSelectionState,
  cell: GridCellAddress,
  modifiers: { shift: boolean; meta: boolean },
): GridSelectionState {
  if (modifiers.shift) {
    return {
      ...current,
      head: cell,
    };
  }

  if (modifiers.meta) {
    const primary = primaryRange(current);
    if (isCellInsideRange(cell, primary)) {
      return { ...current, head: cell };
    }
    const existingIndex = current.cmdRanges.findIndex((range) => isCellInsideRange(cell, range));
    if (existingIndex >= 0) {
      const next = [...current.cmdRanges];
      next.splice(existingIndex, 1);
      return { ...current, head: cell, cmdRanges: next };
    }
    return {
      ...current,
      head: cell,
      cmdRanges: [...current.cmdRanges, makeSingleCellRange(cell)],
    };
  }

  return {
    anchor: cell,
    head: cell,
    cmdRanges: [],
  };
}

export function dragSelection(current: GridSelectionState, cell: GridCellAddress): GridSelectionState {
  return {
    ...current,
    head: cell,
  };
}

export function selectWholeRow(
  row: number,
  editableColumnStart: number,
  editableColumnEnd: number,
): GridSelectionState {
  return {
    anchor: { row, column: editableColumnStart },
    head: { row, column: editableColumnEnd },
    cmdRanges: [],
  };
}

export function selectWholeColumn(column: number, maxRow: number): GridSelectionState {
  return {
    anchor: { row: 0, column },
    head: { row: Math.max(0, maxRow), column },
    cmdRanges: [],
  };
}

export function selectWholeRowActiveStart(
  row: number,
  editableColumnStart: number,
  editableColumnEnd: number,
): GridSelectionState {
  return {
    anchor: { row, column: editableColumnEnd },
    head: { row, column: editableColumnStart },
    cmdRanges: [],
  };
}

export function selectWholeColumnActiveTop(column: number, maxRow: number): GridSelectionState {
  return {
    anchor: { row: Math.max(0, maxRow), column },
    head: { row: 0, column },
    cmdRanges: [],
  };
}
