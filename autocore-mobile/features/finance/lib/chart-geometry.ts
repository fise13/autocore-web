export type ChartPoint = { x: number; y: number };

export type ChartGeometry = {
  points: ChartPoint[];
  /** Smoothed stroke path */
  line: string;
  /** Same curve closed to the baseline for the area fill */
  area: string;
  /** y of value 0 — null when the domain does not include it */
  zeroY: number | null;
  baselineY: number;
  min: number;
  max: number;
};

export type ChartGeometryInput = {
  values: number[];
  width: number;
  height: number;
  padTop?: number;
  padBottom?: number;
  /** Keeps the end-point marker and stroke cap inside the canvas. */
  padX?: number;
};

/**
 * Fritsch–Carlson monotone tangents.
 *
 * A plain Catmull-Rom curve overshoots between close points, which on a profit
 * curve draws losses that never happened. Monotone interpolation cannot invent
 * a turn the data does not contain, so the drawn line stays truthful while
 * still reading as a curve rather than a polyline.
 */
function monotoneTangents(points: ChartPoint[]): number[] {
  const count = points.length;
  if (count < 2) return [0];

  const slopes: number[] = [];
  for (let i = 0; i < count - 1; i += 1) {
    const dx = points[i + 1].x - points[i].x;
    slopes.push(dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx);
  }

  const tangents: number[] = new Array(count).fill(0);
  tangents[0] = slopes[0];
  tangents[count - 1] = slopes[count - 2];

  for (let i = 1; i < count - 1; i += 1) {
    const left = slopes[i - 1];
    const right = slopes[i];
    if (left * right <= 0) {
      tangents[i] = 0;
      continue;
    }
    const average = (left + right) / 2;
    const limit = 3 * Math.min(Math.abs(left), Math.abs(right));
    tangents[i] = Math.sign(average) * Math.min(Math.abs(average), limit);
  }

  return tangents;
}

function toPath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const tangents = monotoneTangents(points);
  let path = `M ${round(points[0].x)} ${round(points[0].y)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const dx = (next.x - current.x) / 3;
    const c1x = current.x + dx;
    const c1y = current.y + tangents[i] * dx;
    const c2x = next.x - dx;
    const c2y = next.y - tangents[i + 1] * dx;
    path += ` C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(next.x)} ${round(next.y)}`;
  }

  return path;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildChartGeometry({
  values,
  width,
  height,
  padTop = 12,
  padBottom = 18,
  padX = 0,
}: ChartGeometryInput): ChartGeometry {
  const safe = values.map((value) => (Number.isFinite(value) ? value : 0));
  const baselineY = height - padBottom;

  if (safe.length === 0 || width <= 0) {
    return {
      points: [],
      line: '',
      area: '',
      zeroY: null,
      baselineY,
      min: 0,
      max: 0,
    };
  }

  let min = Math.min(...safe);
  let max = Math.max(...safe);

  // A curve that includes zero must show it, otherwise a loss reads as a gain.
  if (min > 0 && min / (max || 1) < 0.6) min = 0;
  if (max < 0) max = 0;
  if (min === max) {
    min -= Math.abs(min || 1) * 0.5;
    max += Math.abs(max || 1) * 0.5;
  }

  const span = max - min;
  const innerHeight = Math.max(1, baselineY - padTop);
  const scaleY = (value: number) => baselineY - ((value - min) / span) * innerHeight;

  const innerWidth = Math.max(1, width - padX * 2);
  const step = safe.length > 1 ? innerWidth / (safe.length - 1) : 0;
  const points = safe.map((value, index) => ({
    x: safe.length > 1 ? padX + index * step : width / 2,
    y: scaleY(value),
  }));

  const line = toPath(points);
  const area =
    points.length > 0
      ? `${line} L ${round(points[points.length - 1].x)} ${round(baselineY)} L ${round(points[0].x)} ${round(baselineY)} Z`
      : '';

  return {
    points,
    line,
    area,
    zeroY: min <= 0 && max >= 0 ? scaleY(0) : null,
    baselineY,
    min,
    max,
  };
}

/** Nearest sample to a touch x — the scrub always lands on real data. */
export function nearestIndex(x: number, width: number, count: number, padX = 0): number {
  if (count <= 1) return 0;
  const step = Math.max(1, width - padX * 2) / (count - 1);
  const raw = Math.round((x - padX) / step);
  return Math.min(count - 1, Math.max(0, raw));
}
