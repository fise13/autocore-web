import { format, isToday, isYesterday, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';

import {
  CarIcon,
  CoinsIcon,
  FileTextIcon,
  PackageIcon,
  ReceiptIcon,
  StoreIcon,
  TagIcon,
  UsersIcon,
  WrenchIcon,
} from '@/assets/icons';
import { CATEGORY_ICONS } from '@/lib/accounting/category-icons';
import { growthPercent } from '@/lib/accounting/growth-percent';
import type {
  AccountingAttentionAction,
  AccountingSnapshot,
  AttentionTone,
  CashFlowPeriod,
  InvoiceStatus,
  TransactionStatus,
  TrendTone,
} from '@/features/accounting/types';
import { calculateCashBalance } from '@/lib/accounting/calculate-cash-balance';
import { normalizeSparkline } from '@/lib/charts/sparkline-points';
import { coerceToDate } from '@/lib/firestore-timestamp';
import type { FinancialOperation } from '@/types/financial-operation';
import type { PayrollTransaction } from '@/types/payroll-transaction';

const CATEGORY_LABELS: Record<string, string> = {
  motor_sale: 'Motor sales',
  work_order_income: 'Work orders',
  work_order_parts_cost: 'Parts',
  payroll: 'Payroll',
  logistics: 'Logistics',
  warehouse: 'Warehouse',
  transport: 'Transport',
  fuel: 'Fuel',
  advertising: 'Advertising',
  office: 'Office',
  taxes: 'Taxes',
};

const OPERATION_TITLES: Record<FinancialOperation['type'], string> = {
  sale: 'Sale',
  income: 'Income',
  expense: 'Expense',
  refund: 'Refund',
  transfer: 'Transfer',
};

function isIncomeOperation(operation: FinancialOperation): boolean {
  return operation.type === 'sale' || operation.type === 'income';
}

function isExpenseOperation(operation: FinancialOperation): boolean {
  return operation.type === 'expense' || operation.type === 'refund';
}

function inMonth(date: Date, reference: Date): boolean {
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

function sumInRange(
  operations: FinancialOperation[],
  from: Date,
  to: Date,
  predicate: (operation: FinancialOperation) => boolean,
): number {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  return operations
    .filter((operation) => {
      const createdAt = coerceToDate(operation.createdAt);
      if (!createdAt) return false;
      const ts = createdAt.getTime();
      return ts >= fromMs && ts <= toMs && predicate(operation);
    })
    .reduce((sum, operation) => sum + operation.amount, 0);
}

export { growthPercent } from '@/lib/accounting/growth-percent';

export function sumIncomeInMonth(operations: FinancialOperation[], reference: Date): number {
  const start = startOfMonth(reference);
  const end = reference;
  return sumInRange(operations, start, end, isIncomeOperation);
}

export function sumExpensesInMonth(operations: FinancialOperation[], reference: Date): number {
  const start = startOfMonth(reference);
  const end = reference;
  return sumInRange(operations, start, end, isExpenseOperation);
}

function buildDailySeries(
  operations: FinancialOperation[],
  days: number,
  predicate: (operation: FinancialOperation) => boolean,
): number[] {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => {
    const day = subDays(today, days - 1 - index);
    const key = day.toDateString();
    return operations
      .filter((operation) => {
        const createdAt = coerceToDate(operation.createdAt);
        return createdAt != null && createdAt.toDateString() === key && predicate(operation);
      })
      .reduce((sum, operation) => sum + operation.amount, 0);
  });
}

export function buildBalanceTrend(operations: FinancialOperation[], days = 12): number[] {
  const today = startOfDay(new Date());
  const sorted = [...operations].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const values: number[] = [];

  for (let index = 0; index < days; index += 1) {
    const dayEnd = subDays(today, days - 1 - index);
    const dayEndMs = dayEnd.getTime() + 86_399_999;
    const subset = sorted.filter((operation) => operation.createdAt.getTime() <= dayEndMs);
    values.push(calculateCashBalance(subset).total);
  }

  return normalizeSparkline(values);
}

function toneForChange(changePct: number, invert = false): TrendTone {
  if (changePct === 0) return 'neutral';
  const positive = changePct > 0;
  if (invert) return positive ? 'down' : 'up';
  return positive ? 'up' : 'down';
}

export function buildSummaryCards(
  operations: FinancialOperation[],
  payroll: PayrollTransaction[],
  reference: Date,
): AccountingSnapshot['summary'] {
  const prevMonth = subMonths(reference, 1);
  const revenue = sumIncomeInMonth(operations, reference);
  const expenses = sumExpensesInMonth(operations, reference);
  const profit = revenue - expenses;
  const pendingPayroll = payroll
    .filter((item) => item.status === 'pending')
    .reduce((sum, item) => sum + item.amount, 0);

  const prevRevenue = sumIncomeInMonth(operations, prevMonth);
  const prevExpenses = sumExpensesInMonth(operations, prevMonth);
  const prevProfit = prevRevenue - prevExpenses;

  return [
    {
      id: 'revenue',
      label: 'Revenue',
      value: revenue,
      changePct: growthPercent(prevRevenue, revenue),
      tone: toneForChange(growthPercent(prevRevenue, revenue)),
      sparkline: normalizeSparkline(buildDailySeries(operations, 7, isIncomeOperation)),
    },
    {
      id: 'expenses',
      label: 'Expenses',
      value: expenses,
      changePct: growthPercent(prevExpenses, expenses),
      tone: toneForChange(growthPercent(prevExpenses, expenses), true),
      sparkline: normalizeSparkline(buildDailySeries(operations, 7, isExpenseOperation)),
    },
    {
      id: 'profit',
      label: 'Profit',
      value: profit,
      changePct: growthPercent(prevProfit, profit),
      tone: toneForChange(growthPercent(prevProfit, profit)),
      sparkline: normalizeSparkline(
        buildDailySeries(operations, 7, isIncomeOperation).map((income, index) => {
          const expenseSeries = buildDailySeries(operations, 7, isExpenseOperation);
          return income - expenseSeries[index];
        }),
      ),
    },
    {
      id: 'pending',
      label: 'Awaiting payment',
      value: pendingPayroll,
      changePct: pendingPayroll > 0 ? -pendingPayroll : 0,
      tone: pendingPayroll > 0 ? 'neutral' : 'up',
      sparkline: normalizeSparkline([pendingPayroll]),
    },
  ];
}

function operationCustomer(operation: FinancialOperation): string {
  const raw =
    operation.description?.trim() ||
    operation.comment?.trim() ||
    operation.source?.trim() ||
    operation.details?.trim();
  if (!raw) return 'Customer';
  const firstSegment = raw.split('·')[0]?.trim();
  return firstSegment || raw;
}

function operationIcon(operation: FinancialOperation) {
  if (operation.category === 'motor_sale' || operation.type === 'sale') return CarIcon;
  if (operation.category === 'payroll') return UsersIcon;
  if (operation.category === 'work_order_parts_cost') return WrenchIcon;
  if (operation.category === 'logistics' || operation.category === 'transport') return PackageIcon;
  if (operation.category === 'fuel') return TagIcon;
  if (operation.category === 'warehouse') return StoreIcon;
  if (operation.type === 'refund') return WrenchIcon;
  if (operation.type === 'income') return CoinsIcon;
  if (operation.type === 'expense') return ReceiptIcon;
  return FileTextIcon;
}

function formatOperationTime(date: Date): string {
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'd MMM');
}

function operationStatus(operation: FinancialOperation): TransactionStatus {
  if (operation.type === 'refund') return 'overdue';
  if (operation.type === 'transfer') return 'pending';
  return 'completed';
}

export function buildTransactions(operations: FinancialOperation[]): AccountingSnapshot['transactions'] {
  return operations.slice(0, 12).map((operation) => ({
    id: operation.id,
    title: OPERATION_TITLES[operation.type],
    description: operationCustomer(operation),
    amount: operation.amount,
    direction: isIncomeOperation(operation) ? ('in' as const) : ('out' as const),
    time: formatOperationTime(operation.createdAt),
    status: operationStatus(operation),
    icon: operationIcon(operation),
  }));
}

function buildPeriodSeries(
  operations: FinancialOperation[],
  period: CashFlowPeriod,
): AccountingSnapshot['cashFlow'][CashFlowPeriod] {
  const today = startOfDay(new Date());

  if (period === '7d') {
    const labels = Array.from({ length: 7 }, (_, index) =>
      format(subDays(today, 6 - index), 'EEE'),
    );
    const revenue = buildDailySeries(operations, 7, isIncomeOperation);
    const expenses = buildDailySeries(operations, 7, isExpenseOperation);
    return {
      labels,
      revenue: normalizeSparkline(revenue),
      expenses: normalizeSparkline(expenses),
      profit: normalizeSparkline(revenue.map((value, index) => value - expenses[index])),
    };
  }

  if (period === '30d') {
    const labels = ['1', '5', '10', '15', '20', '25', '30'];
    const revenue = Array.from({ length: 7 }, (_, index) => {
      const from = subDays(today, 30 - index * 5);
      const to = subDays(today, Math.max(0, 30 - (index + 1) * 5));
      return sumInRange(operations, to, from, isIncomeOperation);
    });
    const expenses = Array.from({ length: 7 }, (_, index) => {
      const from = subDays(today, 30 - index * 5);
      const to = subDays(today, Math.max(0, 30 - (index + 1) * 5));
      return sumInRange(operations, to, from, isExpenseOperation);
    });
    return {
      labels,
      revenue: normalizeSparkline(revenue),
      expenses: normalizeSparkline(expenses),
      profit: normalizeSparkline(revenue.map((value, index) => value - expenses[index])),
    };
  }

  if (period === '90d') {
    const labels = ['Apr', '', 'May', '', 'Jun', '', 'Jul'];
    const revenue = Array.from({ length: 7 }, (_, index) => {
      const month = subMonths(today, 6 - index);
      return sumIncomeInMonth(operations, month);
    });
    const expenses = Array.from({ length: 7 }, (_, index) => {
      const month = subMonths(today, 6 - index);
      return sumExpensesInMonth(operations, month);
    });
    return {
      labels,
      revenue: normalizeSparkline(revenue),
      expenses: normalizeSparkline(expenses),
      profit: normalizeSparkline(revenue.map((value, index) => value - expenses[index])),
    };
  }

  const labels = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'];
  const revenue = Array.from({ length: 6 }, (_, index) => {
    const month = subMonths(today, 11 - index * 2);
    return sumIncomeInMonth(operations, month);
  });
  const expenses = Array.from({ length: 6 }, (_, index) => {
    const month = subMonths(today, 11 - index * 2);
    return sumExpensesInMonth(operations, month);
  });
  return {
    labels,
    revenue: normalizeSparkline(revenue),
    expenses: normalizeSparkline(expenses),
    profit: normalizeSparkline(revenue.map((value, index) => value - expenses[index])),
  };
}

export function buildCashFlow(operations: FinancialOperation[]): AccountingSnapshot['cashFlow'] {
  return {
    '7d': buildPeriodSeries(operations, '7d'),
    '30d': buildPeriodSeries(operations, '30d'),
    '90d': buildPeriodSeries(operations, '90d'),
    year: buildPeriodSeries(operations, 'year'),
  };
}

export function buildAttentionItems(
  operations: FinancialOperation[],
  payroll: PayrollTransaction[],
  totalBalance: number,
): AccountingSnapshot['attention'] {
  const items: Array<{
    id: string;
    title: string;
    subtitle: string;
    tone: AttentionTone;
    action: AccountingAttentionAction;
  }> = [];
  const pendingPayroll = payroll.filter((item) => item.status === 'pending');
  const pendingPayrollTotal = pendingPayroll.reduce((sum, item) => sum + item.amount, 0);
  const todayExpenses = operations
    .filter((item) => isToday(item.createdAt) && isExpenseOperation(item))
    .reduce((sum, item) => sum + item.amount, 0);
  const refunds = operations.filter((item) => item.type === 'refund');

  if (pendingPayroll.length > 0) {
    items.push({
      id: 'payroll',
      title:
        pendingPayroll.length === 1
          ? '1 payroll entry'
          : `${pendingPayroll.length} payroll entries`,
      subtitle: `${pendingPayrollTotal.toLocaleString('ru-RU')} ₸ awaiting payout`,
      tone: 'warning',
      action: 'payroll',
    });
  }

  if (refunds.length > 0) {
    items.push({
      id: 'refunds',
      title: refunds.length === 1 ? '1 refund' : `${refunds.length} refunds`,
      subtitle: 'Review warranty cases',
      tone: 'danger',
      action: 'operations',
    });
  }

  if (totalBalance < 0) {
    items.push({
      id: 'negative-balance',
      title: 'Negative balance',
      subtitle: `${totalBalance.toLocaleString('ru-RU')} ₸ across accounts`,
      tone: 'danger',
      action: 'cashbox',
    });
  }

  if (todayExpenses > 0) {
    items.push({
      id: 'today-expenses',
      title: 'Expenses today',
      subtitle: `${todayExpenses.toLocaleString('ru-RU')} ₸`,
      tone: 'neutral',
      action: 'expenses',
    });
  }

  return items.slice(0, 4);
}

export function buildInvoices(
  operations: FinancialOperation[],
  payroll: PayrollTransaction[],
): AccountingSnapshot['invoices'] {
  const incomeInvoices = operations
    .filter(isIncomeOperation)
    .slice(0, 6)
    .map((operation) => ({
      id: operation.id,
      customer: operationCustomer(operation),
      amount: operation.amount,
      status: 'paid' as InvoiceStatus,
      dueDate: format(operation.createdAt, 'd MMM'),
      progress: 100,
    }));

  const payrollInvoices = payroll
    .filter((item) => item.status === 'pending')
    .slice(0, 2)
    .map((item) => ({
      id: `payroll-${item.id}`,
      customer: `Work order #${item.workOrderId.slice(-4)}`,
      amount: item.amount,
      status: 'waiting' as InvoiceStatus,
      dueDate: 'Soon',
      progress: 0,
    }));

  return [...payrollInvoices, ...incomeInvoices].slice(0, 6);
}

export function buildTopCustomers(operations: FinancialOperation[]): AccountingSnapshot['topCustomers'] {
  const grouped = new Map<string, { paid: number; count: number; recent: number; older: number }>();

  for (const operation of operations) {
    if (!isIncomeOperation(operation)) continue;
    const name = operationCustomer(operation);
    const current = grouped.get(name) ?? { paid: 0, count: 0, recent: 0, older: 0 };
    current.paid += operation.amount;
    current.count += 1;
    if (inMonth(operation.createdAt, new Date())) {
      current.recent += operation.amount;
    } else {
      current.older += operation.amount;
    }
    grouped.set(name, current);
  }

  return [...grouped.entries()]
    .sort((a, b) => b[1].paid - a[1].paid)
    .slice(0, 3)
    .map(([name, stats], index) => ({
      id: `customer-${index}`,
      name,
      paid: stats.paid,
      outstanding: 0,
      invoices: stats.count,
      growthPct: growthPercent(stats.older, stats.recent),
    }));
}

export function buildExpenseCategories(operations: FinancialOperation[]): AccountingSnapshot['expenses'] {
  const grouped = new Map<string, number>();

  for (const operation of operations) {
    if (!isExpenseOperation(operation)) continue;
    const key = operation.category?.trim() || 'other';
    grouped.set(key, (grouped.get(key) ?? 0) + operation.amount);
  }

  const total = [...grouped.values()].reduce((sum, value) => sum + value, 0);
  if (!total) return [];

  return [...grouped.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, amount], index) => {
      const iconKey = category in CATEGORY_ICONS ? (category as keyof typeof CATEGORY_ICONS) : 'default';
      const icon = CATEGORY_ICONS[iconKey] ?? CATEGORY_ICONS.default;
      return {
        id: `expense-${index}`,
        label: CATEGORY_LABELS[category] ?? category,
        amount,
        pct: Math.round((amount / total) * 100),
        icon,
      };
    });
}
