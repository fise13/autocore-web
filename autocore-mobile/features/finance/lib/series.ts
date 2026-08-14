import type { FinancialOperation } from '@/types/financial-operation';

import type { FinanceSeriesPoint, FinanceTotals, FinanceWindow } from '../types';
import { affectsProfit, isIncome, operationAt } from './classify';

/** Operations that fall inside a window, already date-coerced and sorted. */
export type DatedOperation = { operation: FinancialOperation; at: Date };

export function datedOperations(operations: FinancialOperation[]): DatedOperation[] {
  const dated: DatedOperation[] = [];
  for (const operation of operations) {
    const at = operationAt(operation);
    if (at) dated.push({ operation, at });
  }
  return dated.sort((left, right) => left.at.getTime() - right.at.getTime());
}

export function operationsInWindow(
  dated: DatedOperation[],
  window: FinanceWindow,
): DatedOperation[] {
  const from = window.from.getTime();
  const to = window.to.getTime();
  return dated.filter((entry) => {
    const ts = entry.at.getTime();
    return ts >= from && ts < to;
  });
}

export function buildSeries(
  dated: DatedOperation[],
  window: FinanceWindow,
): FinanceSeriesPoint[] {
  const points: FinanceSeriesPoint[] = window.buckets.map((bucket) => ({
    bucket,
    revenue: 0,
    expense: 0,
    net: 0,
    cumulativeNet: 0,
    count: 0,
  }));

  const starts = window.buckets.map((bucket) => bucket.start.getTime());
  const windowEnd = window.to.getTime();

  for (const { operation, at } of dated) {
    if (!affectsProfit(operation)) continue;
    const ts = at.getTime();
    if (ts < starts[0] || ts >= windowEnd) continue;

    // Buckets are contiguous and ordered — walk back from the last start that
    // is still <= ts rather than scanning the whole array per operation.
    let index = starts.length - 1;
    while (index > 0 && starts[index] > ts) index -= 1;

    const point = points[index];
    if (isIncome(operation)) point.revenue += operation.amount;
    else point.expense += operation.amount;
    point.count += 1;
  }

  let running = 0;
  for (const point of points) {
    point.net = point.revenue - point.expense;
    running += point.net;
    point.cumulativeNet = running;
  }

  return points;
}

export function totalsFor(dated: DatedOperation[]): FinanceTotals {
  let revenue = 0;
  let expense = 0;
  let salesCount = 0;
  let operationCount = 0;

  for (const { operation } of dated) {
    if (!affectsProfit(operation)) continue;
    operationCount += 1;
    if (isIncome(operation)) {
      revenue += operation.amount;
      salesCount += 1;
    } else {
      expense += operation.amount;
    }
  }

  const net = revenue - expense;

  return {
    revenue,
    expense,
    net,
    margin: revenue > 0 ? net / revenue : null,
    salesCount,
    operationCount,
  };
}

/**
 * Signed relative change. Returns null when the baseline is zero — a jump from
 * nothing is not a percentage, and printing "+100%" there would be a fiction.
 */
export function relativeChange(previous: number, current: number): number | null {
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return null;
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}
