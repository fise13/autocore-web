export type GridScrollMetrics = {
  top: number;
  left: number;
  width: number;
  height: number;
  /** True once the viewport is scrolled horizontally at all (pinned-edge shadow). */
  scrolledX: boolean;
};

/**
 * Snap raw scroll offsets to the row / column boundary they fall in.
 *
 * Grid virtualisation only depends on which row and column the viewport
 * starts in, so snapping lets scroll handlers skip React updates until a
 * boundary is crossed instead of re-rendering every visible cell on every
 * scroll event.
 */
export function snapGridScroll(
  raw: { top: number; left: number; width: number; height: number },
  rowHeight: number,
  xOffsets: readonly number[],
): GridScrollMetrics {
  const top = rowHeight > 0 ? Math.floor(Math.max(0, raw.top) / rowHeight) * rowHeight : 0;
  const left = Math.max(0, raw.left);
  let snappedLeft = 0;
  for (const offset of xOffsets) {
    if (offset > left) break;
    snappedLeft = offset;
  }
  return {
    top,
    left: snappedLeft,
    width: raw.width,
    height: raw.height,
    scrolledX: left > 0,
  };
}

export function sameGridScroll(a: GridScrollMetrics, b: GridScrollMetrics): boolean {
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height &&
    a.scrolledX === b.scrolledX
  );
}
