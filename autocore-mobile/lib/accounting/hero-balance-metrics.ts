import type { MissionControlWeekBar } from '@/features/mission-control/types';
import type { FinancialOperation } from '@/types/financial-operation';

import { calculateCashBalance } from './calculate-cash-balance';
import { buildCashFlow, sumExpensesInMonth, sumIncomeInMonth } from './snapshot-builders';

function isIncomeOperation(operation: FinancialOperation): boolean {
  return operation.type === 'sale' || operation.type === 'income';
}

export type AccountingHeroMetrics = {
  balanceTotal: number;
  growthPercent: number | null;
  weekBars: MissionControlWeekBar[];
  todayNet: number;
  todayIncome: number;
  todayExpense: number;
  growing: boolean;
};

/** Shared hero metrics for Finance balance card and Mission Control revenue card. */
export function buildAccountingHeroMetrics(
  operations: FinancialOperation[],
  now = new Date(),
): AccountingHeroMetrics {
  const balanceTotal = calculateCashBalance(operations).total;
  const monthlyRevenue = sumIncomeInMonth(operations, now);
  const monthlyExpenses = sumExpensesInMonth(operations, now);
  const profit = monthlyRevenue - monthlyExpenses;
  const growthPercent =
    monthlyRevenue > 0 && Number.isFinite(profit) ? (profit / monthlyRevenue) * 100 : null;

  const cashFlow7d = buildCashFlow(operations)['7d'];
  const weekBars = cashFlow7d.labels.map((label, index) => ({
    label: label.slice(0, 2).toLowerCase(),
    value: cashFlow7d.profit[index] ?? 0,
  }));

  const todayKey = now.toDateString();
  let todayIncome = 0;
  let todayExpense = 0;
  for (const op of operations) {
    if (op.createdAt.toDateString() !== todayKey) continue;
    if (isIncomeOperation(op)) todayIncome += op.amount;
    if (op.type === 'expense') todayExpense += op.amount;
  }

  return {
    balanceTotal,
    growthPercent,
    weekBars,
    todayNet: todayIncome - todayExpense,
    todayIncome,
    todayExpense,
    growing: profit >= 0,
  };
}
