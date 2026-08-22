/**
 * Home windows are Finance windows.
 *
 * Reusing `resolveFinanceWindow` means "Last 7 days" means the same seven days
 * on Home as it does in the ledger, and a drill-down never silently re-slices
 * the range. Home exposes three of the four Finance periods — a year is not an
 * operational brief.
 */
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

import { resolveFinanceWindow, resolvePreviousWindow } from '@/features/finance/lib/period';
import type { FinanceBucketGrain, FinanceWindow } from '@/features/finance/types';

import type { HomePeriod, HomePeriodId } from '../types';

export const HOME_PERIOD_IDS: readonly HomePeriodId[] = ['7d', '30d', '3m'] as const;

/**
 * The window Summary flows are measured over — fixed, and printed on every row
 * that uses it.
 *
 * Home is not a report with a range control at the top. Its metrics have
 * different natural periods: cash and stock are positions ("Now"), revenue and
 * new orders are weekly flows. A single global switch would have to lie about
 * one of them, so the period lives with the section it actually governs.
 */
export const HOME_SUMMARY_PERIOD: HomePeriodId = '7d';

/** A week is the operational heartbeat of a shop; longer windows are opt-in. */
export const DEFAULT_HOME_TREND_PERIOD: HomePeriodId = '7d';

/** Human labels for the Trends range control. */
export const HOME_PERIOD_LABELS: Record<HomePeriodId, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '3m': '3 months',
};

export function isHomePeriodId(value: unknown): value is HomePeriodId {
  return typeof value === 'string' && HOME_PERIOD_IDS.includes(value as HomePeriodId);
}

/**
 * Axis labels a person can read at a glance.
 *
 * Finance labels day buckets with the day of the month, which is right in a
 * ledger where the row above gives the month. Under a chart on Home the same
 * label reads as a bare number — "14 … 20" says nothing about a week. Weekdays
 * do, so Home relabels rather than making the reader decode.
 */
export function bucketLabel(
  start: Date,
  grain: FinanceBucketGrain,
  bucketCount: number,
): string {
  // Weekdays name the days of one week. Across a month they repeat four times
  // over and stop identifying anything, so the label becomes a date.
  if (grain === 'day') {
    return bucketCount <= 7
      ? format(start, 'EEE', { locale: enUS })
      : format(start, 'd MMM', { locale: enUS });
  }
  if (grain === 'week') return format(start, 'd MMM', { locale: enUS });
  return format(start, 'MMM', { locale: enUS });
}

function toHomePeriod(window: FinanceWindow): HomePeriod {
  return {
    id: window.period.id as HomePeriodId,
    label: window.period.label,
    longLabel: window.period.longLabel,
    comparisonLabel: window.period.comparisonLabel,
    start: window.from,
    end: window.to,
    buckets: window.buckets.map((bucket) => ({
      start: bucket.start,
      end: bucket.end,
      label: bucketLabel(bucket.start, window.period.grain, window.buckets.length),
    })),
  };
}

export type HomeWindows = {
  period: HomePeriod;
  current: FinanceWindow;
  previous: FinanceWindow;
};

export function resolveHomeWindows(id: HomePeriodId, now = new Date()): HomeWindows {
  const current = resolveFinanceWindow(id, now);
  return {
    period: toHomePeriod(current),
    current,
    previous: resolvePreviousWindow(current),
  };
}
