import { calculateCashBalance } from '@/lib/accounting/calculate-cash-balance';
import type { FinancialOperation } from '@/types/financial-operation';
import type { PayrollTransaction } from '@/types/payroll-transaction';
import type { WorkOrder } from '@/types/work-order';

import type {
  FinanceAttention,
  FinanceDataGap,
  FinanceModel,
  FinancePeriodId,
} from '../types';
import { buildActivity } from './activity';
import { buildChange } from './drivers';
import { formatMoneyAdaptive } from './format';
import { buildFlow } from './flow';
import { buildHealth, runwayDays, scoreFromSignals, buildSignals, windowDays } from './health';
import { resolveFinanceWindow, resolvePreviousWindow } from './period';
import { buildProfitability } from './profitability';
import {
  buildSeries,
  datedOperations,
  operationsInWindow,
  relativeChange,
  totalsFor,
} from './series';

export type BuildFinanceModelInput = {
  operations: FinancialOperation[];
  payroll: PayrollTransaction[];
  orders: WorkOrder[];
  workOrderNumbers: Record<string, string>;
  period: FinancePeriodId;
  now?: Date;
};

/**
 * The whole Finance surface is derived here, once, from the same ledger the
 * operations list reads. Nothing on screen is generated, sampled or padded:
 * where the data does not support a metric the model returns null and records
 * the gap so the UI can say what is missing instead of showing a plausible
 * number.
 */
export function buildFinanceModel(input: BuildFinanceModelInput): FinanceModel {
  const now = input.now ?? new Date();
  const window = resolveFinanceWindow(input.period, now);
  const previousWindow = resolvePreviousWindow(window);

  const dated = datedOperations(input.operations);
  const current = operationsInWindow(dated, window);
  const previous = operationsInWindow(dated, previousWindow);

  const series = buildSeries(current, window);
  const totals = totalsFor(current);
  const previousTotals = totalsFor(previous);

  // Cash is a position, not a flow: it is the balance of the whole ledger as of
  // now, never a slice of the selected window.
  const balance = calculateCashBalance(input.operations);
  const runway = runwayDays(balance.total, totals.expense, windowDays(window));

  const healthInput = {
    window,
    totals,
    previousTotals,
    cashTotal: balance.total,
  };

  // The comparison score walks the same model one window back, so "+6 pts" is
  // the same calculation applied to the same shape of data.
  const previousPreviousWindow = resolvePreviousWindow(previousWindow);
  const previousPrevious = operationsInWindow(dated, previousPreviousWindow);
  const previousScore = scoreFromSignals(
    buildSignals({
      window: previousWindow,
      totals: previousTotals,
      previousTotals: totalsFor(previousPrevious),
      cashTotal: balance.total,
    }),
  );

  const health = buildHealth(healthInput, previousScore);
  const change = buildChange(current, previous);
  const flow = buildFlow(current, previous);
  const profitability = buildProfitability(current, previous, input.orders, input.payroll);
  const activity = buildActivity(current, input.workOrderNumbers);

  return {
    window,
    previousWindow,
    series,
    totals,
    previousTotals,
    growth: {
      revenue: relativeChange(previousTotals.revenue, totals.revenue),
      expense: relativeChange(previousTotals.expense, totals.expense),
      net: relativeChange(previousTotals.net, totals.net),
      margin:
        totals.margin != null && previousTotals.margin != null
          ? totals.margin - previousTotals.margin
          : null,
    },
    cash: {
      total: balance.total,
      cashbox: balance.cashbox,
      kaspi: balance.kaspi,
      runwayDays: runway,
    },
    health,
    change,
    flow,
    profitability,
    activity,
    attention: collectAttention(input.payroll, balance.total),
    gaps: collectGaps(profitability),
    hasData: current.length > 0,
  };
}

/**
 * Two conditions the ledger can prove and the operator needs to act on. Kept
 * deliberately short — an alert list that grows becomes wallpaper.
 */
function collectAttention(
  payroll: BuildFinanceModelInput['payroll'],
  cashTotal: number,
): FinanceAttention[] {
  const attention: FinanceAttention[] = [];

  const pending = payroll.filter((entry) => entry.status === 'pending');
  if (pending.length > 0) {
    const total = pending.reduce((sum, entry) => sum + entry.amount, 0);
    attention.push({
      id: 'pending_payroll',
      title: `${pending.length} payroll ${pending.length === 1 ? 'entry' : 'entries'} awaiting payout`,
      detail: `${formatMoneyAdaptive(total)} already earned and not yet paid.`,
    });
  }

  if (cashTotal < 0) {
    attention.push({
      id: 'negative_cash',
      title: 'Accounts are negative',
      detail: `${formatMoneyAdaptive(cashTotal)} across the cash box and card.`,
    });
  }

  return attention;
}

function collectGaps(profitability: FinanceModel['profitability']): FinanceDataGap[] {
  const gaps: FinanceDataGap[] = [];

  if (profitability.engines.units > 0 && profitability.engines.withCostBasis < profitability.engines.units) {
    const missing = profitability.engines.units - profitability.engines.withCostBasis;
    gaps.push({
      id: 'engine_cost_basis',
      label: 'Engine margin',
      detail:
        missing === profitability.engines.units
          ? 'Engine sales do not record what the engine cost, so margin per model cannot be calculated — only revenue and mix.'
          : `${missing} of ${profitability.engines.units} engine sales have no recorded cost, so those models show revenue only.`,
    });
  }

  const unpricedLabor = profitability.workOrders.filter((order) => !order.laborRecorded).length;
  if (unpricedLabor > 0) {
    gaps.push({
      id: 'work_order_labor',
      label: 'Work order labor',
      detail: `${unpricedLabor} ${unpricedLabor === 1 ? 'order has' : 'orders have'} no payroll rows yet, so their margin counts parts cost only.`,
    });
  }

  gaps.push({
    id: 'inventory_valuation',
    label: 'Inventory efficiency',
    detail:
      'Stock is not valued on mobile — engine and part records carry no cost value, so turnover cannot be measured.',
  });

  return gaps;
}
