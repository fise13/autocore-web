import type { FinanceModel } from '../types';
import { formatMoneyAdaptive, formatPercent, formatSignedPercent, formatSignedPoints } from './format';
import { deltaDirection, toneForValue, type FinDeltaDirection, type FinTone } from './tone';

export type FinanceTrendId = 'margin' | 'revenue' | 'costs' | 'cash';

export type FinanceTrendMetric = {
  id: FinanceTrendId;
  label: string;
  /** Formatted headline value */
  value: string;
  /** Formatted signed change, or null when there is no baseline */
  delta: string | null;
  deltaTone: FinTone;
  /** Which way the number moved — separate from whether that is welcome. */
  deltaDirection: FinDeltaDirection;
  /** What the change is measured against */
  deltaCaption: string;
  /** Per-bucket shape for the row sparkline and the detail chart */
  series: number[];
  /** Colour key for the detail chart: 'auto' follows the sign */
  chartColor: 'auto' | 'primary' | 'foreground';
  /** One sentence: what this number is */
  meaning: string;
  /** One sentence: how it is calculated from the ledger */
  method: string;
  /** Secondary facts shown in the detail header */
  facts: Array<{ label: string; value: string }>;
};

/**
 * Trend definitions live here rather than in the row component, so the overview
 * row and the detail screen are guaranteed to state the same value, the same
 * change and the same method.
 */
export function buildTrendMetrics(model: FinanceModel): FinanceTrendMetric[] {
  const { totals, previousTotals, growth, series, window } = model;
  const comparison = window.period.comparisonLabel;

  // Running margin: cumulative profit over cumulative revenue. A per-bucket
  // margin swings wildly on quiet days and would read as volatility that the
  // business did not experience.
  let runningRevenue = 0;
  let runningNet = 0;
  const marginSeries = series.map((point) => {
    runningRevenue += point.revenue;
    runningNet += point.net;
    return runningRevenue > 0 ? runningNet / runningRevenue : 0;
  });

  let cumulativeRevenue = 0;
  const revenueSeries = series.map((point) => {
    cumulativeRevenue += point.revenue;
    return cumulativeRevenue;
  });

  let cumulativeExpense = 0;
  const expenseSeries = series.map((point) => {
    cumulativeExpense += point.expense;
    return cumulativeExpense;
  });

  const marginPoints = growth.margin == null ? null : growth.margin * 100;

  return [
    {
      id: 'margin',
      label: 'Profit margin',
      value: formatPercent(totals.margin),
      delta: marginPoints == null ? null : `${formatSignedPoints(marginPoints, 1)} pts`,
      deltaTone: toneForValue(marginPoints),
      deltaDirection: deltaDirection(marginPoints),
      deltaCaption: comparison,
      series: marginSeries,
      chartColor: 'auto',
      meaning: 'The share of everything you invoiced that survived as profit.',
      method: 'Net profit ÷ revenue, both taken from the operations in this period.',
      facts: [
        { label: 'Revenue', value: formatMoneyAdaptive(totals.revenue) },
        { label: 'Net profit', value: formatMoneyAdaptive(totals.net) },
        {
          label: 'Previous margin',
          value: previousTotals.margin == null ? '—' : formatPercent(previousTotals.margin),
        },
      ],
    },
    {
      id: 'revenue',
      label: 'Revenue',
      value: formatMoneyAdaptive(totals.revenue),
      delta: growth.revenue == null ? null : formatSignedPercent(growth.revenue),
      deltaTone: toneForValue(growth.revenue),
      deltaDirection: deltaDirection(growth.revenue),
      deltaCaption: comparison,
      series: revenueSeries,
      chartColor: 'primary',
      meaning: 'Everything that came in — engine sales, work orders, parts and other income.',
      method: 'Sum of sale and income operations dated inside this period.',
      facts: [
        { label: 'Operations', value: String(totals.salesCount) },
        { label: 'Previous period', value: formatMoneyAdaptive(previousTotals.revenue) },
        {
          label: 'Average per sale',
          value:
            totals.salesCount > 0
              ? formatMoneyAdaptive(totals.revenue / totals.salesCount)
              : '—',
        },
      ],
    },
    {
      id: 'costs',
      label: 'Operating costs',
      value: formatMoneyAdaptive(totals.expense),
      delta: growth.expense == null ? null : formatSignedPercent(growth.expense),
      // Costs rising is the unwelcome direction.
      deltaTone: toneForValue(growth.expense, false),
      deltaDirection: deltaDirection(growth.expense),
      deltaCaption: comparison,
      series: expenseSeries,
      chartColor: 'foreground',
      meaning: 'Everything that went out — stock, parts, payroll, logistics and refunds.',
      method: 'Sum of expense and refund operations dated inside this period.',
      facts: [
        { label: 'Previous period', value: formatMoneyAdaptive(previousTotals.expense) },
        {
          label: 'Share of revenue',
          value: totals.revenue > 0 ? formatPercent(totals.expense / totals.revenue) : '—',
        },
        {
          label: 'Daily average',
          value: formatMoneyAdaptive(totals.expense / Math.max(1, series.length)),
        },
      ],
    },
    {
      id: 'cash',
      label: 'Cash position',
      value: formatMoneyAdaptive(model.cash.total),
      delta:
        model.cash.runwayDays == null
          ? null
          : `${Math.round(model.cash.runwayDays)} ${Math.round(model.cash.runwayDays) === 1 ? 'day' : 'days'}`,
      deltaTone: toneForValue(
        model.cash.runwayDays == null ? null : model.cash.runwayDays - 30,
      ),
      // Cash cover is a standing position, not a movement — no arrow.
      deltaDirection: 'none',
      deltaCaption: 'of cover at this period’s spend',
      series: series.map((point) => point.cumulativeNet),
      chartColor: 'auto',
      meaning: 'What is actually on hand across the cash box and the card account.',
      method: 'Balance of every operation ever recorded — a position, not a period total.',
      facts: [
        { label: 'Cash box', value: formatMoneyAdaptive(model.cash.cashbox) },
        { label: 'Card', value: formatMoneyAdaptive(model.cash.kaspi) },
        {
          label: 'Daily spend',
          value: formatMoneyAdaptive(totals.expense / Math.max(1, series.length)),
        },
      ],
    },
  ];
}

export function findTrendMetric(
  model: FinanceModel,
  id: string,
): FinanceTrendMetric | undefined {
  return buildTrendMetrics(model).find((metric) => metric.id === id);
}
