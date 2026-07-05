export function growthPercent(first: number, second: number): number {
  if (!first) return second > 0 ? 100 : 0;
  return Math.round(((second - first) / first) * 100);
}
