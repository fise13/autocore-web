import { RefObject, useCallback, useEffect } from "react";

import { GridCellAddress, GridRange } from "@/lib/grid/grid-types";
import { GridSelectionState, primaryRange } from "@/lib/grid/selection-controller";

export type GridCellFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type EnsureCellVisibleOptions = {
  headerHeight: number;
  padding?: number;
};

type UseGridScrollIntoViewOptions = {
  bodyRef: RefObject<HTMLDivElement | null>;
  selection: GridSelectionState;
  resolveFrame: (cell: GridCellAddress) => GridCellFrame | null;
  headerHeight: number;
  padding?: number;
};

export function ensureCellVisible(
  viewport: HTMLElement,
  frame: GridCellFrame,
  { headerHeight, padding = 0 }: EnsureCellVisibleOptions,
) {
  const top = headerHeight + frame.y;
  const bottom = top + frame.height;
  const visibleTop = viewport.scrollTop + headerHeight + padding;
  const visibleBottom = viewport.scrollTop + viewport.clientHeight - padding;

  if (top < visibleTop) {
    viewport.scrollTop = Math.max(0, top - headerHeight - padding);
  } else if (bottom > visibleBottom) {
    viewport.scrollTop = bottom - viewport.clientHeight + padding;
  }

  const left = frame.x;
  const right = frame.x + frame.width;
  const visibleLeft = viewport.scrollLeft + padding;
  const visibleRight = viewport.scrollLeft + viewport.clientWidth - padding;

  if (left < visibleLeft) {
    viewport.scrollLeft = Math.max(0, left - padding);
  } else if (right > visibleRight) {
    viewport.scrollLeft = right - viewport.clientWidth + padding;
  }
}

export function topLeftCellOfRange(range: GridRange): GridCellAddress {
  return {
    row: range.minRow,
    column: range.minColumn,
  };
}

export function useGridScrollIntoView({
  bodyRef,
  selection,
  resolveFrame,
  headerHeight,
  padding,
}: UseGridScrollIntoViewOptions) {
  const scrollToCell = useCallback(
    (cell: GridCellAddress) => {
      const viewport = bodyRef.current;
      if (!viewport) return;
      const frame = resolveFrame(cell);
      if (!frame) return;
      ensureCellVisible(viewport, frame, { headerHeight, padding });
    },
    [bodyRef, headerHeight, padding, resolveFrame],
  );

  const scrollToRange = useCallback(
    (range: GridRange) => {
      scrollToCell(topLeftCellOfRange(range));
    },
    [scrollToCell],
  );

  useEffect(() => {
    scrollToRange(primaryRange(selection));
  }, [scrollToRange, selection]);

  return { scrollToCell, scrollToRange };
}
