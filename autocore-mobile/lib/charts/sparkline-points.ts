/** Ensure a chart series is safe for SVG polyline rendering (no NaN, min 2 points). */
export function sanitizeChartSeries(values: number[], minLength = 2): number[] {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return Array.from({ length: minLength }, () => 0);
  }
  if (finite.length === 1) {
    return Array.from({ length: minLength }, () => finite[0]);
  }
  return finite;
}

export function buildSparklinePoints(
  values: number[],
  width: number,
  height: number,
  padding = 2,
): string {
  const series = sanitizeChartSeries(values);
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const xDenom = Math.max(series.length - 1, 1);
  const innerHeight = Math.max(height - padding, 1);

  return series
    .map((value, index) => {
      const x = (index / xDenom) * width;
      const y = height - ((value - min) / range) * innerHeight - padding / 2;
      const safeX = Number.isFinite(x) ? x : 0;
      const safeY = Number.isFinite(y) ? y : height / 2;
      return `${safeX},${safeY}`;
    })
    .join(' ');
}

export function normalizeSparkline(values: number[]): number[] {
  const series = sanitizeChartSeries(values);
  const max = Math.max(...series.map(Math.abs));
  if (!max) return series.map(() => 0);
  return series.map((value) => Number((value / max).toFixed(2)));
}
