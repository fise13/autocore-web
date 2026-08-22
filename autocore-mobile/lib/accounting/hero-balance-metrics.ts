import { format, isToday, startOfDay, subDays } from 'date-fns';
import { enUS } from 'date-fns/locale';

import type { OverviewWeekBar } from '@/features/overview/types';
import type { FinancialOperation } from '@/types/financial-operation';
import { coerceToDate } from '@/lib/firestore-timestamp';

import { calculateCashBalance } from './calculate-cash-balance';
import { sumExpensesInMonth, sumIncomeInMonth } from './snapshot-builders';

function isIncomeOperation(operation: FinancialOperation): boolean {
  return operation.type === 'sale' || operation.type === 'income';
}

function buildRawWeekBars(operations: FinancialOperation[], now: Date): OverviewWeekBar[] {
  const today = startOfDay(now);

  return Array.from({ length: 7 }, (_, index) => {
    const day = subDays(today, 6 - index);
    const label = format(day, 'EEE', { locale: enUS });
    const key = day.toDateString();
    let income = 0;
    let expense = 0;

    for (const operation of operations) {
      const createdAt = coerceToDate(operation.createdAt);
      if (!createdAt || createdAt.toDateString() !== key) continue;
      if (isIncomeOperation(operation)) income += operation.amount;
      if (operation.type === 'expense') expense += operation.amount;
    }

    return { label, value: income - expense };
  });
}

export type AccountingHeroMetrics = {
  balanceTotal: number;
  growthPercent: number | null;
  weekBars: OverviewWeekBar[];
  todayNet: number;
  todayIncome: number;
  todayExpense: number;
  growing: boolean;
};

/** Shared hero metrics for Finance balance card and Overview revenue card. */
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

  const weekBars = buildRawWeekBars(operations, now);

  let todayIncome = 0;
  let todayExpense = 0;
  for (const operation of operations) {
    const createdAt = coerceToDate(operation.createdAt);
    if (!createdAt || !isToday(createdAt)) continue;
    if (isIncomeOperation(operation)) todayIncome += operation.amount;
    if (operation.type === 'expense') todayExpense += operation.amount;
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
