/**
 * Monitor-aware excel-grid density and column fit.
 *
 * Semantic columns stay dense. Extra workspace width is absorbed by columns
 * marked `role: "flex"` (Configuration / Special Notes on the engine grid).
 * Fixed columns never grow. Semi-fixed columns may take a small capped share.
 * When flex columns exist, the table fills the scrollport — no trailing gutter.
 */

export type GridDensityBand = "compact" | "cozy" | "wide" | "ultrawide";

export type GridColumnFitRole = "fixed" | "semi" | "flex";

export type GridDensityProfile = {
  band: GridDensityBand;
  /** Multiplier on base column / row sizes (before user zoom). */
  scale: number;
  /**
   * Max extra pixels for grids that have no flex columns (warehouse).
   * Engine grid bypasses this when any column is `role: "flex"`.
   */
  maxAbsorbPx: number;
};

export type GridColumnFitHint = {
  /** Growth weight; 0 = never grow. */
  flex: number;
  /** Hard cap in base (pre-zoom, pre-density) pixels. Use Infinity for flex fillers. */
  maxWidth: number;
  /** Optional resize / clamp floor in base pixels. */
  minWidth?: number;
  /**
   * `fixed` — never absorb leftover.
   * `semi` — small capped growth.
   * `flex` — absorbs remaining workspace after semi-fixed caps.
   */
  role?: GridColumnFitRole;
};

export function resolveColumnFitRole(hint: GridColumnFitHint | undefined): GridColumnFitRole {
  if (hint?.role) return hint.role;
  if (!hint || hint.flex <= 0) return "fixed";
  return "semi";
}

/** Content-area width bands (px), after sidebar — proxy for 13″ → 34″+ desks. */
export function densityForContainerWidth(containerWidth: number): GridDensityProfile {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return { band: "cozy", scale: 1, maxAbsorbPx: 96 };
  }
  if (containerWidth < 1100) {
    return { band: "compact", scale: 0.92, maxAbsorbPx: 160 };
  }
  if (containerWidth < 1650) {
    return { band: "cozy", scale: 1, maxAbsorbPx: 120 };
  }
  if (containerWidth < 2100) {
    return { band: "wide", scale: 1, maxAbsorbPx: 64 };
  }
  return { band: "ultrawide", scale: 1, maxAbsorbPx: 0 };
}

type FlexTarget = {
  index: number;
  flex: number;
  room: number;
};

function distributeByFlex(widths: number[], extra: number, targets: FlexTarget[]): number {
  let remaining = Math.floor(Math.max(0, extra));
  if (remaining <= 0 || targets.length === 0) return 0;

  const active: FlexTarget[] = targets
    .filter((target) => target.flex > 0 && target.room > 0)
    .map((target) => ({ ...target }));

  let guard = 0;
  while (remaining > 0 && active.length > 0 && guard < 48) {
    guard += 1;
    const flexTotal = active.reduce((sum, target) => sum + target.flex, 0);
    if (flexTotal <= 0) break;

    let progressed = false;
    for (let i = 0; i < active.length; i += 1) {
      const target = active[i];
      const isLast = i === active.length - 1;
      const share = isLast
        ? remaining
        : Math.floor((remaining * target.flex) / flexTotal);
      const add = Math.max(0, Math.min(target.room, share));
      if (add <= 0) continue;
      widths[target.index] += add;
      target.room -= add;
      remaining -= add;
      progressed = true;
      if (remaining <= 0) break;
    }

    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].room <= 0) active.splice(i, 1);
    }
    if (!progressed) break;
  }

  return extra - remaining;
}

export function fitColumnWidths(params: {
  baseWidths: number[];
  hints: GridColumnFitHint[];
  containerWidth: number;
  maxAbsorbPx: number;
  lockedIndexes?: ReadonlySet<number>;
}): number[] {
  const { baseWidths, hints, containerWidth, maxAbsorbPx, lockedIndexes } = params;
  const count = baseWidths.length;
  if (count === 0) return [];

  const widths = baseWidths.map((width, index) => {
    const locked = lockedIndexes?.has(index);
    const hint = hints[index];
    const min = Math.max(1, hint?.minWidth ?? 1);
    const max = hint?.maxWidth;
    if (locked) return Math.max(1, Math.round(width));
    if (max != null && Number.isFinite(max)) {
      return Math.min(Math.max(1, max), Math.max(min, Math.round(width)));
    }
    return Math.max(min, Math.round(width));
  });

  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return widths;
  }

  const baseTotal = widths.reduce((sum, width) => sum + width, 0);
  const rawExtra = Math.floor(containerWidth - baseTotal);
  if (rawExtra <= 0) return widths;

  const hasFlex = hints.some(
    (hint, index) => resolveColumnFitRole(hint) === "flex" && !lockedIndexes?.has(index),
  );
  const extraBudget = hasFlex
    ? rawExtra
    : Math.min(rawExtra, Math.max(0, maxAbsorbPx));
  if (extraBudget <= 0) return widths;

  const collect = (role: GridColumnFitRole, unbounded: boolean): FlexTarget[] => {
    const targets: FlexTarget[] = [];
    for (let index = 0; index < count; index += 1) {
      if (lockedIndexes?.has(index)) continue;
      const hint = hints[index];
      if (resolveColumnFitRole(hint) !== role) continue;
      const flex = Math.max(0, hint?.flex ?? 0);
      if (flex <= 0) continue;
      const max = hint?.maxWidth;
      const room = unbounded || max == null || !Number.isFinite(max)
        ? Number.POSITIVE_INFINITY
        : Math.max(0, Math.floor(max) - widths[index]);
      if (room <= 0) continue;
      targets.push({ index, flex, room });
    }
    return targets;
  };

  let remaining = extraBudget;
  if (hasFlex) {
    remaining -= distributeByFlex(widths, remaining, collect("flex", false));
    if (remaining > 0) {
      remaining -= distributeByFlex(widths, remaining, collect("flex", true));
    }
    if (remaining > 0) {
      const fallback = [...widths.keys()].reverse().find((index) => {
        if (lockedIndexes?.has(index)) return false;
        return resolveColumnFitRole(hints[index]) === "flex";
      });
      if (fallback != null) widths[fallback] += remaining;
    }
  } else {
    remaining -= distributeByFlex(widths, remaining, collect("semi", false));
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

export function gridPhotoThumbSize(band: GridDensityBand): "sm" | "md" | "lg" {
  if (band === "compact") return "sm";
  if (band === "wide" || band === "ultrawide") return "lg";
  return "md";
}

export type DensityLayoutColumn = {
  id?: string;
  width: number;
  fit?: GridColumnFitHint;
};

/**
 * Apply density scale → zoom → leftover absorb for any column set.
 * `widthOverrides` are already in zoomed pixels (user-resized) and stay locked.
 */
export function applyDensityToColumns<T extends DensityLayoutColumn>(params: {
  columns: T[];
  zoom: number;
  containerWidth?: number;
  scaleDimension: (base: number, zoom: number) => number;
  baseRowHeight: number;
  baseHeaderHeight: number;
  widthOverrides?: Readonly<Record<string, number>>;
  minOverrideWidth?: number;
}): {
  widths: number[];
  rowHeight: number;
  headerHeight: number;
  density: GridDensityProfile;
  xOffsets: number[];
  totalWidth: number;
} {
  const density = densityForContainerWidth(params.containerWidth ?? 0);
  const lockedIndexes = new Set<number>();
  const baseWidths = params.columns.map((column, index) => {
    const scaled = params.scaleDimension(Math.round(column.width * density.scale), params.zoom);
    const id = column.id;
    const override = id && params.widthOverrides ? params.widthOverrides[id] : undefined;
    if (override == null) return scaled;
    lockedIndexes.add(index);
    const min = params.minOverrideWidth ?? column.fit?.minWidth ?? 1;
    return Math.max(min, Math.round(override));
  });
  const hints: GridColumnFitHint[] = params.columns.map((column) => {
    const fit = column.fit ?? { flex: 1, maxWidth: Math.round(column.width * 1.35) };
    const scaleMax = Number.isFinite(fit.maxWidth)
      ? params.scaleDimension(Math.round(fit.maxWidth * density.scale), params.zoom)
      : Number.POSITIVE_INFINITY;
    return {
      flex: fit.flex,
      maxWidth: scaleMax,
      minWidth: fit.minWidth
        ? params.scaleDimension(Math.round(fit.minWidth * density.scale), params.zoom)
        : undefined,
      role: fit.role,
    };
  });
  const widths = fitColumnWidths({
    baseWidths,
    hints,
    containerWidth: params.containerWidth ?? 0,
    maxAbsorbPx: Math.round(density.maxAbsorbPx * params.zoom),
    lockedIndexes,
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
