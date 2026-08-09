import { coerceToDate } from '@/lib/firestore-timestamp';
import type { WorkOrder } from '@/types/work-order';

import type { OverviewInsightChart } from '../types';

const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'] as const;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function closedCountInRange(orders: WorkOrder[], start: Date, end: Date): number {
  return orders.filter((order) => {
    if (!['completed', 'delivered'].includes(order.status)) return false;
    const closedAt = coerceToDate(order.completedAt) ?? coerceToDate(order.updatedAt);
    if (!closedAt) return false;
    return closedAt >= start && closedAt < end;
  }).length;
}

/** Last N weeks of closed work-order counts — for Health-style close-rate trends. */
export function buildWeeklyClosedCounts(
  orders: WorkOrder[],
  now = new Date(),
  weeks = 6,
): Array<{ label: string; value: number }> {
  const today = startOfDay(now);
  const points: Array<{ label: string; value: number }> = [];

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() - i * 7 + 1);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);
    const label = WEEK_LABELS[weeks - 1 - i] ?? `W${weeks - i}`;
    points.push({
      label,
      value: closedCountInRange(orders, weekStart, weekEnd),
    });
  }

  return points;
}

/** True only when a series carries a real signal — never decorative empty/flat charts. */
export function insightChartIsUseful(chart: OverviewInsightChart | null | undefined): boolean {
  if (!chart || chart.points.length < 4) return false;
  const values = chart.points.map((p) => p.value);
  if (values.every((v) => v <= 0)) return false;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const nonzero = values.filter((v) => v > 0).length;
  return max > 0 && (max !== min || nonzero >= 3);
}

export function averageOfPoints(points: Array<{ value: number }>): number {
  if (points.length === 0) return 0;
  return points.reduce((sum, p) => sum + p.value, 0) / points.length;
}
