import { coerceToDate } from '@/lib/firestore-timestamp';
import { isWarehouseLowStock } from '@/lib/inventory/is-low-stock';
import { isOpenStatus } from '@/lib/work-order/work-order-utils';
import type { InventoryItem } from '@/types/inventory';
import type { WorkOrder } from '@/types/work-order';

import { endOfWeek, startOfWeek } from './weeks';

const UNLOCATED_LOCATION_CODE = 'UNLOCATED';

function itemIsAwaitingPlacement(
  item: Pick<InventoryItem, 'primaryLocationCode' | 'primaryLocationId'>,
): boolean {
  const code = item.primaryLocationCode?.trim().toUpperCase();
  if (code === UNLOCATED_LOCATION_CODE) return true;
  return !code && !item.primaryLocationId?.trim();
}

function formatCount(value: number): string {
  const safe = Math.max(0, Math.trunc(value));
  return String(safe).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatTrendAverage(value: number): string {
  return formatCount(value);
}

export const WORK_TODAY_LONG_WEEKS = 18;
export const WORK_TODAY_SHORT_WEEKS = 8;

export type WorkTodayTrendDirection = 'up' | 'down' | 'flat';

export type WorkTodayTrend = {
  /** Raw weekly attention-load counts, oldest → newest (length = LONG_WEEKS). */
  points: number[];
  /**
   * Series drawn on the Health chart — left cluster centered on `longAverage`,
   * right cluster on `shortAverage` (so the 18-week bar always has a graph).
   */
  chartPoints: number[];
  longAverage: number;
  shortAverage: number;
  longWeeks: number;
  shortWeeks: number;
  direction: WorkTodayTrendDirection;
  insight: string;
};

/** Live queues that feed Work → Today (same signals as attention rows). */
export type WorkTodayTrendSources = {
  orders: WorkOrder[];
  items: InventoryItem[];
  intakeJobs: Array<{
    state: string;
    createdAt?: unknown;
    updatedAt?: unknown;
  }>;
  /** Pending payroll + claimable jobs (current-week contribution when undated). */
  earningsAttention: number;
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundAvg(value: number): number {
  return Math.round(value);
}

function orderOpenedAt(order: WorkOrder): Date | undefined {
  return coerceToDate(order.createdAt) ?? coerceToDate(order.updatedAt);
}

/**
 * Reconstruct open work-order count at a week boundary.
 * Falls back to `updatedAt` when `createdAt` is missing (common on mobile cache).
 */
export function openWorkCountAt(orders: WorkOrder[], at: Date): number {
  let count = 0;
  for (const order of orders) {
    const opened = orderOpenedAt(order);
    if (!opened || opened > at) continue;

    if (order.status === 'cancelled') {
      const cancelledAt = coerceToDate(order.updatedAt) ?? opened;
      if (cancelledAt <= at) continue;
      count += 1;
      continue;
    }

    const closed =
      coerceToDate(order.completedAt) ??
      (isOpenStatus(order.status) ? undefined : coerceToDate(order.updatedAt));

    if (closed && closed <= at) continue;
    count += 1;
  }
  return count;
}

function isIntakeAwaiting(state: string): boolean {
  return state === 'open' || state === 'rework';
}

/** Prefer create time; fall back to update; undated live rows span the whole window. */
function itemPresentBy(weekEnd: Date, createdAt?: Date, updatedAt?: Date): boolean {
  const opened = createdAt ?? updatedAt;
  if (!opened) return true;
  return opened <= weekEnd;
}

/**
 * Attention load at week end — same queues as Work Today rows.
 *
 * Inventory: gate on `createdAt` (now mapped on mobile), not `updatedAt` alone.
 * Using only `updatedAt` zeroes the left chart after syncs; counting every live
 * SKU for all weeks forces 18-week avg == 8-week avg (652/652). Create-time
 * gating restores a real Health-style long vs short comparison.
 */
export function attentionLoadAt(
  sources: WorkTodayTrendSources,
  weekEnd: Date,
  _options?: { isCurrentWeek: boolean },
): number {
  const { orders, items, intakeJobs, earningsAttention } = sources;
  let count = openWorkCountAt(orders, weekEnd);

  for (const item of items) {
    if (item.status !== 'active') continue;
    const created = coerceToDate(item.createdAt);
    const updated = coerceToDate(item.updatedAt);

    if (item.totalOnHand > 0 && itemIsAwaitingPlacement(item)) {
      if (itemPresentBy(weekEnd, created, updated)) count += 1;
    }
    if (isWarehouseLowStock(item)) {
      if (itemPresentBy(weekEnd, created, updated)) count += 1;
    }
  }

  for (const job of intakeJobs) {
    if (!isIntakeAwaiting(job.state)) continue;
    const opened = coerceToDate(job.createdAt) ?? coerceToDate(job.updatedAt);
    if (!opened || opened <= weekEnd) count += 1;
  }

  if (earningsAttention > 0) {
    count += earningsAttention;
  }

  return count;
}

export function buildWeeklyAttentionSeries(
  sources: WorkTodayTrendSources,
  now = new Date(),
  weeks = WORK_TODAY_LONG_WEEKS,
): number[] {
  const thisWeek = startOfWeek(now);
  const points: number[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = new Date(thisWeek);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = endOfWeek(weekStart);
    points.push(
      attentionLoadAt(sources, weekEnd, {
        isCurrentWeek: i === 0,
      }),
    );
  }
  return points;
}

function resolveDirection(shortAvg: number, longAvg: number): WorkTodayTrendDirection {
  const delta = shortAvg - longAvg;
  const scale = Math.max(longAvg, shortAvg, 1);
  if (Math.abs(delta) / scale < 0.08 && Math.abs(delta) < 1.5) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

function buildInsight(direction: WorkTodayTrendDirection, shortWeeks: number): string {
  if (direction === 'down') {
    return `Over the last ${shortWeeks} weeks, open work decreased on average.`;
  }
  if (direction === 'up') {
    return `Over the last ${shortWeeks} weeks, open work increased on average.`;
  }
  return `Over the last ${shortWeeks} weeks, open work held steady on average.`;
}

/**
 * Apple Health Highlights layout: thick avg bars sit *on* the dotted series.
 * Raw weekly load can be ~0 on the left while the 18-week mean is mid-scale
 * (pulled up by recent weeks) — then the long bar floats with no graph under it.
 * Re-center each region on its average so left dots track `longAvg` and right
 * dots track `shortAvg`, preserving within-region shape.
 */
export function buildHealthChartPoints(
  weekly: number[],
  longAvg: number,
  shortAvg: number,
  shortWeeks = WORK_TODAY_SHORT_WEEKS,
): number[] {
  const n = weekly.length;
  if (n === 0) return [];

  const split = Math.max(1, n - shortWeeks);
  const left = weekly.slice(0, split);
  const right = weekly.slice(split);
  const leftMean = mean(left);
  const rightMean = mean(right.length > 0 ? right : left);
  const leftFlat = left.every((value) => value === left[0]);
  const rightFlat = right.length === 0 || right.every((value) => value === right[0]);

  return weekly.map((value, index) => {
    if (index < split) {
      if (leftFlat) {
        const wobble = ((index % 3) - 1) * Math.max(longAvg * 0.015, 1);
        return Math.max(0, longAvg + wobble);
      }
      return Math.max(0, longAvg + (value - leftMean));
    }

    const recentIndex = index - split;
    if (rightFlat) {
      const wobble = ((recentIndex % 3) - 1) * Math.max(shortAvg * 0.015, 1);
      return Math.max(0, shortAvg + wobble);
    }
    return Math.max(0, shortAvg + (value - rightMean));
  });
}

/**
 * Health Highlights–style trend for Work → Today.
 * Uses the same live queues as attention rows — not orders-only.
 */
export function buildWorkTodayTrend(
  sources: WorkTodayTrendSources | WorkOrder[],
  now = new Date(),
): WorkTodayTrend {
  const normalized: WorkTodayTrendSources = Array.isArray(sources)
    ? { orders: sources, items: [], intakeJobs: [], earningsAttention: 0 }
    : sources;

  const points = buildWeeklyAttentionSeries(normalized, now, WORK_TODAY_LONG_WEEKS);
  const shortPoints = points.slice(-WORK_TODAY_SHORT_WEEKS);
  const longAverage = roundAvg(mean(points));
  const shortAverage = roundAvg(mean(shortPoints));
  const direction = resolveDirection(shortAverage, longAverage);
  const chartPoints = buildHealthChartPoints(points, longAverage, shortAverage);

  return {
    points,
    chartPoints,
    longAverage,
    shortAverage,
    longWeeks: WORK_TODAY_LONG_WEEKS,
    shortWeeks: WORK_TODAY_SHORT_WEEKS,
    direction,
    insight: buildInsight(direction, WORK_TODAY_SHORT_WEEKS),
  };
}

/** @deprecated Use buildWeeklyAttentionSeries */
export function buildWeeklyOpenSeries(
  orders: WorkOrder[],
  now = new Date(),
  weeks = WORK_TODAY_LONG_WEEKS,
): number[] {
  return buildWeeklyAttentionSeries(
    { orders, items: [], intakeJobs: [], earningsAttention: 0 },
    now,
    weeks,
  );
}
