/**
 * Monitor-aware excel-grid density.
 *
 * Wide / ultrawide viewports must NOT inflate every column to fill the screen —
 * that creates the sparse “empty oceans” look. We only close small leftover gaps
 * on mid-size displays, and only on columns marked flexible, up to per-column caps.
 */

export type GridDensityBand = "compact" | "cozy" | "wide" | "ultrawide";

export type GridDensityProfile = {
  band: GridDensityBand;
  /** Multiplier on base column / row sizes (before user zoom). */
  scale: number;
  /**
   * Max extra pixels we’ll distribute into flexible columns.
   * `0` on ultrawide = keep content-optimal widths, leave a trailing gutter.
   */
  maxAbsorbPx: number;
};

export type GridColumnFitHint = {
  /** Growth weight; 0 = never grow. */
  flex: number;
  /** Hard cap in base (pre-zoom, pre-density) pixels. */
  maxWidth: number;
};

/** Content-area width bands (px), after sidebar — proxy for 13″ → 34″+ desks. */
export function densityForContainerWidth(containerWidth: number): GridDensityProfile {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return { band: "cozy", scale: 1, maxAbsorbPx: 96 };
  }
  if (containerWidth < 1100) {
    // 13–14″ laptops / split view — slightly tighter, ok to close small gaps.
    return { band: "compact", scale: 0.92, maxAbsorbPx: 160 };
  }
  if (containerWidth < 1650) {
    // 15–24″ typical desk — comfortable defaults.
    return { band: "cozy", scale: 1, maxAbsorbPx: 120 };
  }
  if (containerWidth < 2100) {
    // Large 27–32″ — barely absorb leftover; prefer scroll/gutter over stretch.
    return { band: "wide", scale: 1, maxAbsorbPx: 64 };
  }
  // Ultrawide / 4K desk — never stretch; keep scannable column density.
  return { band: "ultrawide", scale: 1, maxAbsorbPx: 0 };
}

export function fitColumnWidths(params: {
  baseWidths: number[];
  hints: GridColumnFitHint[];
  containerWidth: number;
  maxAbsorbPx: number;
}): number[] {
  const { baseWidths, hints, containerWidth, maxAbsorbPx } = params;
  const count = baseWidths.length;
  if (count === 0) return [];

  const widths = baseWidths.map((width, index) => {
    const hint = hints[index];
    const max = hint?.maxWidth ?? width;
    return Math.min(width, Math.max(1, max));
  });

  const baseTotal = widths.reduce((sum, width) => sum + width, 0);
  if (!Number.isFinite(containerWidth) || containerWidth <= 0 || maxAbsorbPx <= 0) {
    return widths;
  }

  const rawExtra = containerWidth - baseTotal;
  if (rawExtra <= 0) return widths;

  const room = widths.map((width, index) => {
    const hint = hints[index];
    if (!hint || hint.flex <= 0) return 0;
    return Math.max(0, hint.maxWidth - width);
  });
  const roomTotal = room.reduce((sum, value) => sum + value, 0);
  if (roomTotal <= 0) return widths;

  const absorb = Math.min(rawExtra, maxAbsorbPx, roomTotal);
  const flexTotal = hints.reduce((sum, hint, index) => {
    if (room[index] <= 0) return sum;
    return sum + Math.max(0, hint?.flex ?? 0);
  }, 0);
  if (flexTotal <= 0) return widths;

  let used = 0;
  const flexibleIndexes: number[] = [];
  for (let index = 0; index < count; index += 1) {
    if (room[index] > 0 && (hints[index]?.flex ?? 0) > 0) flexibleIndexes.push(index);
  }

  for (let i = 0; i < flexibleIndexes.length; i += 1) {
    const index = flexibleIndexes[i];
    const hint = hints[index];
    const isLast = i === flexibleIndexes.length - 1;
    let add: number;
    if (isLast) {
      add = Math.min(room[index], absorb - used);
    } else {
      add = Math.min(room[index], Math.floor((absorb * hint.flex) / flexTotal));
      used += add;
    }
    widths[index] += Math.max(0, add);
  }

  return widths;
}

export function buildOffsetMetrics(columnWidths: number[]): {
  xOffsets: number[];
  totalWidth: number;
} {
  const xOffsets: number[] = [];
  let cursor = 0;
  for (const width of columnWidths) {
    xOffsets.push(cursor);
    cursor += width;
  }
  return { xOffsets, totalWidth: cursor };
}

/** Header label size that stays readable when columns stay dense. */
export function gridHeaderFontSizePx(zoom: number, densityScale: number): number {
  return Math.max(10, Math.round(11 * zoom * Math.max(densityScale, 0.9)));
}

export type DensityLayoutColumn = {
  width: number;
  fit?: GridColumnFitHint;
};

/**
 * Apply density scale → zoom → capped leftover absorb for any column set.
 */
export function applyDensityToColumns<T extends DensityLayoutColumn>(params: {
  columns: T[];
  zoom: number;
  containerWidth?: number;
  scaleDimension: (base: number, zoom: number) => number;
  baseRowHeight: number;
  baseHeaderHeight: number;
}): {
  widths: number[];
  rowHeight: number;
  headerHeight: number;
  density: GridDensityProfile;
  xOffsets: number[];
  totalWidth: number;
} {
  const density = densityForContainerWidth(params.containerWidth ?? 0);
  const baseWidths = params.columns.map((column) =>
    params.scaleDimension(Math.round(column.width * density.scale), params.zoom),
  );
  const hints: GridColumnFitHint[] = params.columns.map((column) => {
    const fit = column.fit ?? { flex: 1, maxWidth: Math.round(column.width * 1.35) };
    return {
      flex: fit.flex,
      maxWidth: params.scaleDimension(Math.round(fit.maxWidth * density.scale), params.zoom),
    };
  });
  const widths = fitColumnWidths({
    baseWidths,
    hints,
    containerWidth: params.containerWidth ?? 0,
    maxAbsorbPx: Math.round(density.maxAbsorbPx * params.zoom),
  });
  const { xOffsets, totalWidth } = buildOffsetMetrics(widths);
  return {
    widths,
    rowHeight: params.scaleDimension(Math.round(params.baseRowHeight * density.scale), params.zoom),
    headerHeight: params.scaleDimension(
      Math.round(params.baseHeaderHeight * density.scale),
      params.zoom,
    ),
    density,
    xOffsets,
    totalWidth,
  };
}
