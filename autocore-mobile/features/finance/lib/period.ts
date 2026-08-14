import {
  addDays,
  addMonths,
  addWeeks,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { enUS } from 'date-fns/locale';

import type { FinanceBucket, FinancePeriod, FinancePeriodId, FinanceWindow } from '../types';

/**
 * Four windows, each with the bucket grain that keeps the profit curve readable
 * on a phone: days up to a month, weeks up to a quarter, months for a year.
 */
export const FINANCE_PERIODS: readonly FinancePeriod[] = [
  {
    id: '7d',
    label: '7D',
    longLabel: 'Last 7 days',
    comparisonLabel: 'vs previous 7 days',
    grain: 'day',
    buckets: 7,
  },
  {
    id: '30d',
    label: '30D',
    longLabel: 'Last 30 days',
    comparisonLabel: 'vs previous 30 days',
    grain: 'day',
    buckets: 30,
  },
  {
    id: '3m',
    label: '3M',
    longLabel: 'Last 13 weeks',
    comparisonLabel: 'vs previous 13 weeks',
    grain: 'week',
    buckets: 13,
  },
  {
    id: '1y',
    label: '1Y',
    longLabel: 'Last 12 months',
    comparisonLabel: 'vs previous 12 months',
    grain: 'month',
    buckets: 12,
  },
] as const;

export const DEFAULT_FINANCE_PERIOD: FinancePeriodId = '30d';

export function financePeriod(id: FinancePeriodId): FinancePeriod {
  return FINANCE_PERIODS.find((entry) => entry.id === id) ?? FINANCE_PERIODS[1];
}

const WEEK_OPTIONS = { weekStartsOn: 1 as const, locale: enUS };

function bucketStarts(period: FinancePeriod, anchor: Date): Date[] {
  if (period.grain === 'day') {
    const last = startOfDay(anchor);
    return Array.from({ length: period.buckets }, (_, index) =>
      subDays(last, period.buckets - 1 - index),
    );
  }

  if (period.grain === 'week') {
    const last = startOfWeek(anchor, WEEK_OPTIONS);
    return Array.from({ length: period.buckets }, (_, index) =>
      subWeeks(last, period.buckets - 1 - index),
    );
  }

  const last = startOfMonth(anchor);
  return Array.from({ length: period.buckets }, (_, index) =>
    subMonths(last, period.buckets - 1 - index),
  );
}

function bucketEnd(start: Date, grain: FinancePeriod['grain']): Date {
  if (grain === 'day') return addDays(start, 1);
  if (grain === 'week') return addWeeks(start, 1);
  return addMonths(start, 1);
}

function labelFor(start: Date, grain: FinancePeriod['grain']): { label: string; fullLabel: string } {
  if (grain === 'day') {
    return {
      label: format(start, 'd', { locale: enUS }),
      fullLabel: format(start, 'EEE d MMM', { locale: enUS }),
    };
  }
  if (grain === 'week') {
    return {
      label: format(start, 'd MMM', { locale: enUS }),
      fullLabel: `Week of ${format(start, 'd MMM', { locale: enUS })}`,
    };
  }
  return {
    label: format(start, 'MMM', { locale: enUS }),
    fullLabel: format(start, 'MMMM yyyy', { locale: enUS }),
  };
}

function buildBuckets(period: FinancePeriod, anchor: Date): FinanceBucket[] {
  return bucketStarts(period, anchor).map((start) => ({
    start,
    end: bucketEnd(start, period.grain),
    ...labelFor(start, period.grain),
  }));
}

function windowFromBuckets(period: FinancePeriod, buckets: FinanceBucket[]): FinanceWindow {
  return {
    period,
    from: buckets[0].start,
    to: buckets[buckets.length - 1].end,
    buckets,
  };
}

/** The window the user is looking at — ends with the bucket containing `now`. */
export function resolveFinanceWindow(id: FinancePeriodId, now = new Date()): FinanceWindow {
  const period = financePeriod(id);
  return windowFromBuckets(period, buildBuckets(period, now));
}

/**
 * The equally long window that ends where the current one starts. Comparisons
 * are only ever made against this — never against a partial or padded range.
 */
export function resolvePreviousWindow(current: FinanceWindow): FinanceWindow {
  const { period } = current;
  const anchor =
    period.grain === 'day'
      ? subDays(current.from, 1)
      : period.grain === 'week'
        ? subWeeks(current.from, 1)
        : subMonths(current.from, 1);

  return windowFromBuckets(period, buildBuckets(period, anchor));
}

/** "1 – 30 Mar" / "Mar – Aug 2026" — the quiet caption under the chart. */
export function formatWindowRange(window: FinanceWindow): string {
  const last = window.buckets[window.buckets.length - 1];
  if (window.period.grain === 'month') {
    return `${format(window.from, 'MMM yyyy', { locale: enUS })} – ${format(last.start, 'MMM yyyy', { locale: enUS })}`;
  }
  const sameMonth = window.from.getMonth() === last.start.getMonth();
  const left = sameMonth
    ? format(window.from, 'd', { locale: enUS })
    : format(window.from, 'd MMM', { locale: enUS });
  return `${left} – ${format(last.start, 'd MMM', { locale: enUS })}`;
}
