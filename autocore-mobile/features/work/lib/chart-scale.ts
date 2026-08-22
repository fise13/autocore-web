/**
 * Truthful Y-scale for trend charts.
 *
 * The axis is derived from the dataset on every recompute — never a fixed
 * range, never a forced zero baseline. Rules the engine holds to:
 *
 *  - padding is a fraction of the *data* range (10–20%), so a flat series
 *    cannot be stretched into drama and a volatile one cannot be flattened;
 *  - bounds snap to human-friendly "nice" intervals (1 / 2 / 2.5 / 5 × 10ⁿ)
 *    with 3–5 levels, so the same metric reads comparably week to week;
 *  - zero enters the axis only when the metric semantically needs it, or when
 *    padding would otherwise show impossible negative values;
 *  - a zero-range (perfectly flat) dataset gets a minimum visual range instead
 *    of a divide-by-zero or a hairline band;
 *  - companion series (average bars) share the axis but are never smoothed,
 *    clipped, or re-centred.
 *
 * Pure module — no React, no react-native imports, so `node --test` can run it.
 */

/** Mantissas that read as round numbers on an axis. */
const NICE_FRACTIONS = [1, 2, 2.5, 5] as const;
/** Same set minus the fractional step, for integer metrics like counts. */
const NICE_INTEGER_FRACTIONS = [1, 2, 5] as const;

const MIN_TICKS = 3;
const MAX_TICKS = 5;
const DEFAULT_TARGET_TICKS = 4;

const MIN_PADDING = 0.1;
const MAX_PADDING = 0.2;
const DEFAULT_PADDING = 0.15;

/** Guards the step-search loops against pathological inputs. */
const STEP_SEARCH_LIMIT = 16;

export type ChartScaleOptions = {
  /**
   * Values that must land on the same axis (long/short averages).
   * They widen the window when they fall outside the series, never narrow it.
   */
  companions?: number[];
  /** Metric that is meaningless without a zero baseline (e.g. share of total). */
  zeroBaseline?: boolean;
  /** Fraction of the data range added above and below. Clamped to 0.10–0.20. */
  padding?: number;
  /**
   * Smallest span the axis may render. Stops a ±1 wiggle from filling the
   * plot and reading as a collapse.
   */
  minVisualRange?: number;
  /** Preferred level count. The result is still clamped to 3–5. */
  targetTicks?: number;
  /** Metric counted in whole units — keeps ticks off 2.5 / 0.5 steps. */
  integer?: boolean;
  /** Permit an axis below zero even when every value is non-negative. */
  allowNegative?: boolean;
};

export type ChartScale = {
  /** Axis bounds after padding, minimum range, and nice-interval snapping. */
  min: number;
  max: number;
  /** Nice interval between levels. */
  step: number;
  /** 3–5 evenly spaced levels, `min` … `max` inclusive. */
  ticks: number[];
  /** Untouched extent of the real values — outliers included. */
  dataMin: number;
  dataMax: number;
  dataRange: number;
};

function decompose(value: number): { mag: number; frac: number } {
  const exponent = Math.floor(Math.log10(value) + 1e-12);
  const mag = 10 ** exponent;
  return { mag, frac: value / mag };
}

function fractionsFor(integer: boolean): readonly number[] {
  return integer ? NICE_INTEGER_FRACTIONS : NICE_FRACTIONS;
}

/** Smallest nice interval that is at least `rough`. */
export function niceStep(rough: number, integer = false): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const { mag, frac } = decompose(rough);
  const found = fractionsFor(integer).find((candidate) => candidate >= frac - 1e-9);
  const step = found !== undefined ? found * mag : 10 * mag;
  return integer ? Math.max(1, Math.round(step)) : step;
}

/** Next nice interval above `step` — used when a scale wants fewer levels. */
export function nextNiceStep(step: number, integer = false): number {
  const { mag, frac } = decompose(step);
  const found = fractionsFor(integer).find((candidate) => candidate > frac + 1e-9);
  const next = found !== undefined ? found * mag : 10 * mag;
  return integer ? Math.max(1, Math.round(next)) : next;
}

/** Previous nice interval below `step` — used when a scale wants more levels. */
export function prevNiceStep(step: number, integer = false): number {
  const fractions = fractionsFor(integer);
  const { mag, frac } = decompose(step);
  const found = [...fractions].reverse().find((candidate) => candidate < frac - 1e-9);
  const prev =
    found !== undefined ? found * mag : fractions[fractions.length - 1] * (mag / 10);
  return integer ? Math.max(1, Math.round(prev)) : prev;
}

/** `-0` reads as `-0` in labels and comparisons — normalise it away. */
function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

/**
 * Nice levels *inside* `[min, max]`.
 *
 * Deliberately not d3's `nice()` outward snap: rounding the bounds out to the
 * tick lattice inflates a 5–10 series onto a 0–15 axis, which squashes the
 * data into a third of the plot and makes a real move look like noise. Bounds
 * stay at the padded data range — every dataset then fills the same share of
 * the plot, which is what makes two readings comparable.
 */
function buildInnerTicks(
  min: number,
  max: number,
  targetTicks: number,
  integer: boolean,
): { step: number; ticks: number[] } {
  const span = max - min;
  let step = niceStep(span / Math.max(1, targetTicks - 1), integer);

  const levels = (currentStep: number) => {
    const first = Math.ceil(min / currentStep - 1e-9);
    const last = Math.floor(max / currentStep + 1e-9);
    const count = last - first + 1;
    return { first, last, count };
  };

  let current = levels(step);

  for (let guard = 0; current.count > MAX_TICKS && guard < STEP_SEARCH_LIMIT; guard += 1) {
    step = nextNiceStep(step, integer);
    current = levels(step);
  }

  for (let guard = 0; current.count < MIN_TICKS && guard < STEP_SEARCH_LIMIT; guard += 1) {
    const smaller = prevNiceStep(step, integer);
    // Integer metrics stop at 1 — half-unit gridlines under a count are noise.
    if (smaller >= step || (integer && smaller < 1)) break;
    step = smaller;
    current = levels(step);
  }

  if (current.count < 1) {
    // Degenerate band (e.g. 7.2–7.8 under an integer metric): no nice value
    // fits. Show the window itself rather than an unlined plot.
    return { step: span / 2, ticks: [min, min + span / 2, max].map(normalizeZero) };
  }

  const ticks = Array.from({ length: current.count }, (_, index) => {
    const value = (current.first + index) * step;
    return normalizeZero(Math.abs(value) < 1e-9 ? 0 : Number(value.toPrecision(12)));
  });

  return { step, ticks };
}

/**
 * Derive the axis for a dataset. Returns `null` for an empty dataset so the
 * caller can render an empty state rather than an invented axis.
 */
export function computeChartScale(
  values: number[],
  options: ChartScaleOptions = {},
): ChartScale | null {
  const data = values.filter((value) => Number.isFinite(value));
  if (data.length === 0) return null;

  const companions = (options.companions ?? []).filter((value) => Number.isFinite(value));
  const {
    zeroBaseline = false,
    minVisualRange = 0,
    targetTicks = DEFAULT_TARGET_TICKS,
    integer = false,
    allowNegative = false,
  } = options;

  const padding = Math.min(MAX_PADDING, Math.max(MIN_PADDING, options.padding ?? DEFAULT_PADDING));

  const dataMin = Math.min(...data);
  const dataMax = Math.max(...data);
  const dataRange = dataMax - dataMin;

  // Averages ride the same coordinate system, so they take part in the extent.
  const extentMin = Math.min(dataMin, ...companions);
  const extentMax = Math.max(dataMax, ...companions);
  const extentRange = extentMax - extentMin;

  let low: number;
  let high: number;

  if (extentRange === 0) {
    // Perfectly flat: invent a window around the value instead of a zero span.
    const anchor = extentMin;
    const invented = Math.max(minVisualRange, Math.abs(anchor) * 0.25, integer ? 2 : 1e-6);
    low = anchor - invented / 2;
    high = anchor + invented / 2;
  } else {
    const pad = extentRange * padding;
    low = extentMin - pad;
    high = extentMax + pad;
  }

  // Minimum visual range — small movement must not fill the plot.
  const currentRange = high - low;
  if (minVisualRange > currentRange) {
    const centre = (low + high) / 2;
    low = centre - minVisualRange / 2;
    high = centre + minVisualRange / 2;
  }

  if (zeroBaseline) {
    // Only when the metric genuinely needs it (rule: never force zero otherwise).
    low = Math.min(0, extentMin);
  } else if (!allowNegative && extentMin >= 0 && low < 0) {
    // Padding must not invent impossible values under a non-negative metric.
    low = 0;
  }

  // A clamp at zero must not eat the minimum window it just enforced.
  if (minVisualRange > high - low) high = low + minVisualRange;
  if (high <= low) high = low + (minVisualRange || 1);

  const min = normalizeZero(low);
  const max = normalizeZero(high);
  const { step, ticks } = buildInnerTicks(min, max, targetTicks, integer);

  return { min, max, step, ticks, dataMin, dataMax, dataRange };
}

/** 0 at the axis floor, 1 at the axis ceiling. Values are never clipped. */
export function normalizeToScale(scale: ChartScale, value: number): number {
  const span = scale.max - scale.min;
  if (span <= 0) return 0.5;
  return (value - scale.min) / span;
}

/** Pixel Y for a value, top-down (screen coordinates). */
export function scaleToY(
  scale: ChartScale,
  value: number,
  plotTop: number,
  plotHeight: number,
): number {
  return plotTop + (1 - normalizeToScale(scale, value)) * plotHeight;
}

/** Evenly spaced X for index `i` of `count` points. */
export function scaleToX(index: number, count: number, plotLeft: number, plotWidth: number): number {
  if (count <= 1) return plotLeft + plotWidth / 2;
  return plotLeft + (index / (count - 1)) * plotWidth;
}

/**
 * How many points to skip between markers so dots never collide.
 * The line and the underlying data stay complete — only markers thin out.
 */
export function markerStride(count: number, plotWidth: number, minSpacing = 14): number {
  if (count <= 2 || plotWidth <= 0 || minSpacing <= 0) return 1;
  const spacing = plotWidth / (count - 1);
  if (spacing >= minSpacing) return 1;
  return Math.max(1, Math.ceil(minSpacing / spacing));
}

/** First and last points always carry a marker — they anchor the reading. */
export function showsMarker(index: number, count: number, stride: number): boolean {
  if (stride <= 1) return true;
  if (index === 0 || index === count - 1) return true;
  return index % stride === 0;
}
