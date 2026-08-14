import { startOfMonth, subDays, subMonths, startOfDay } from 'date-fns';

import { buildAccountingHeroMetrics } from '@/lib/accounting/hero-balance-metrics';
import { growthPercent } from '@/lib/accounting/growth-percent';
import { sumIncomeInMonth } from '@/lib/accounting/snapshot-builders';
import { coerceToDate } from '@/lib/firestore-timestamp';
import type { FinancialOperation } from '@/types/financial-operation';

import type { OverviewRevenue, OverviewWeekBar } from '../types';

const WEEKDAY_SHORT_RU = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function isIncomeOperation(operation: FinancialOperation): boolean {
  return operation.type === 'sale' || operation.type === 'income';
}

function operationDate(operation: FinancialOperation): Date | null {
  return coerceToDate(operation.createdAt) ?? null;
}

function dayKey(date: Date): string {
  return startOfDay(date).toDateString();
}

export function incomeForDay(operations: FinancialOperation[], day: Date): number {
  const key = dayKey(day);
  return operations
    .filter((operation) => {
      const createdAt = operationDate(operation);
      return createdAt != null && dayKey(createdAt) === key && isIncomeOperation(operation);
    })
    .reduce((sum, operation) => sum + operation.amount, 0);
}

export function sumWeekIncome(operations: FinancialOperation[], endDay: Date, days = 7): number {
  const today = startOfDay(endDay);
  let total = 0;
  for (let offset = 0; offset < days; offset += 1) {
    const day = subDays(today, offset);
    total += incomeForDay(operations, day);
  }
  return total;
}

export function buildWeekRevenueBars(
  operations: FinancialOperation[],
  now = new Date(),
): OverviewWeekBar[] {
  const today = startOfDay(now);
  const bars: OverviewWeekBar[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = subDays(today, offset);
    bars.push({
      label: WEEKDAY_SHORT_RU[day.getDay()] ?? '',
      value: incomeForDay(operations, day),
    });
  }
  return bars;
}

/** Weekly chart bars — only daily cash flow; no cumulative balance fallback. */
export function resolveWeekChartBars(
  _operations: FinancialOperation[],
  primaryBars: OverviewWeekBar[],
  _now: Date,
): OverviewWeekBar[] {
  return primaryBars;
}

export function computeWeekRevenueGrowth(
  operations: FinancialOperation[],
  now = new Date(),
): number | null {
  const today = startOfDay(now);
  const thisWeek = sumWeekIncome(operations, today, 7);
  const prevWeekEnd = subDays(today, 7);
  const prevWeek = sumWeekIncome(operations, prevWeekEnd, 7);
  if (prevWeek <= 0 && thisWeek <= 0) return null;
  return growthPercent(prevWeek, thisWeek);
}

export function computeMonthRevenueGrowth(
  operations: FinancialOperation[],
  now = new Date(),
): number | null {
  const thisMonth = sumIncomeInMonth(operations, now);
  const prevMonth = sumIncomeInMonth(operations, subMonths(now, 1));
  if (prevMonth <= 0 && thisMonth <= 0) return null;
  return growthPercent(prevMonth, thisMonth);
}

export function resolveOverviewRevenue(input: {
  accountingEnabled: boolean;
  operations: FinancialOperation[];
  orderWeekRevenue: number;
  orderWeekBars: OverviewWeekBar[];
  orderWeekGrowth: number | null;
  balanceTotal: number;
  now?: Date;
}): OverviewRevenue {
  const now = input.now ?? new Date();
  const hasFinanceOperations =
    input.operations.length > 0 && input.operations.some((operation) => isIncomeOperation(operation));
  const useFinanceRevenue = input.accountingEnabled || hasFinanceOperations;

  if (useFinanceRevenue) {
    const hero = buildAccountingHeroMetrics(input.operations, now);

    return {
      label: 'Balance · This month',
      value: hero.balanceTotal,
      growthPercent: hero.growthPercent,
      weekBars: hero.weekBars,
      todayNet: hero.todayNet,
      todayIncome: hero.todayIncome,
      todayExpense: hero.todayExpense,
      route: '/(tabs)/accounting',
    };
  }

  return {
    label: 'Revenue · This week',
    value: input.orderWeekRevenue,
    growthPercent: input.orderWeekGrowth,
    weekBars: input.orderWeekBars,
    route: '/orders',
  };
}
