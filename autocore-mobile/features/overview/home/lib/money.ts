/**
 * The money side of Home, derived from the same ledger primitives Finance uses.
 *
 * Home does not build a second accounting engine: it reuses `datedOperations`,
 * `operationsInWindow`, `totalsFor`, `buildSeries` and `calculateCashBalance`,
 * so a figure on Home and the same figure in Finance can never disagree.
 */
import {
  buildSeries,
  datedOperations,
  operationsInWindow,
  totalsFor,
} from '@/features/finance/lib/series';
import type { FinanceWindow } from '@/features/finance/types';
import { calculateCashBalance } from '@/lib/accounting/calculate-cash-balance';
import type { FinancialOperation } from '@/types/financial-operation';

import type { HomeSeriesPoint } from '../types';
import { bucketLabel } from './period';

export type HomeMoneyTotals = {
  revenue: number;
  expense: number;
  net: number;
};

export type HomeMoneySnapshot = {
  totals: HomeMoneyTotals;
  previousTotals: HomeMoneyTotals;
  /** Cash is a position as of now — never a slice of the selected window. */
  cashTotal: number;
  revenueSeries: HomeSeriesPoint[];
  expenseSeries: HomeSeriesPoint[];
  netSeries: HomeSeriesPoint[];
  /** Operations that landed inside the window — drives recency. */
  windowOperationCount: number;
  /** Newest operation timestamp anywhere in the ledger, or null. */
  lastOperationAt: Date | null;
  /** True when the previous window holds no operations to compare against. */
  noBaseline: boolean;
};

export const EMPTY_HOME_MONEY: HomeMoneySnapshot = {
  totals: { revenue: 0, expense: 0, net: 0 },
  previousTotals: { revenue: 0, expense: 0, net: 0 },
  cashTotal: 0,
  revenueSeries: [],
  expenseSeries: [],
  netSeries: [],
  windowOperationCount: 0,
  lastOperationAt: null,
  noBaseline: true,
};

export function buildHomeMoney(
  operations: FinancialOperation[],
  window: FinanceWindow,
  previousWindow: FinanceWindow,
): HomeMoneySnapshot {
  const dated = datedOperations(operations);
  const current = operationsInWindow(dated, window);
  const previous = operationsInWindow(dated, previousWindow);

  const totals = totalsFor(current);
  const previousTotals = totalsFor(previous);
  const series = buildSeries(current, window);
  const balance = calculateCashBalance(operations);

  const lastOperationAt = dated.length > 0 ? dated[dated.length - 1].at : null;

  return {
    totals: { revenue: totals.revenue, expense: totals.expense, net: totals.net },
    previousTotals: {
      revenue: previousTotals.revenue,
      expense: previousTotals.expense,
      net: previousTotals.net,
    },
    cashTotal: balance.total,
    // Home relabels the buckets: Finance's day-of-month reads as a bare number
    // under a chart, where a weekday tells the reader what they are looking at.
    revenueSeries: series.map((point) => ({
      label: bucketLabel(point.bucket.start, window.period.grain, series.length),
      value: point.revenue,
    })),
    expenseSeries: series.map((point) => ({
      label: bucketLabel(point.bucket.start, window.period.grain, series.length),
      value: point.expense,
    })),
    netSeries: series.map((point) => ({
      label: bucketLabel(point.bucket.start, window.period.grain, series.length),
      value: point.net,
    })),
    windowOperationCount: current.length,
    lastOperationAt,
    noBaseline: previous.length === 0,
  };
}
