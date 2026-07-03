import {
  FileTextIcon,
  PackageIcon,
  ReceiptIcon,
  TrendingUpIcon,
  UsersIcon,
  CoinsIcon,
} from '@/assets/icons';
import { accountingQuickActions } from '@/lib/accounting/quick-actions';
import type { AccountingSnapshot, CashFlowPeriod } from '@/features/accounting/types';
import { calculateCashBalance } from '@/lib/accounting/calculate-cash-balance';
import type { FinancialOperation } from '@/types/financial-operation';
import type { PayrollTransaction } from '@/types/payroll-transaction';

import {
  buildAttentionItems,
  buildBalanceTrend,
  buildCashFlow,
  buildExpenseCategories,
  buildInvoices,
  buildSummaryCards,
  buildTopCustomers,
  buildTransactions,
  sumExpensesInMonth,
  sumIncomeInMonth,
} from './snapshot-builders';

export type ComputeAccountingSnapshotInput = {
  operations: FinancialOperation[];
  payroll: PayrollTransaction[];
};

export function computeAccountingSnapshot(input: ComputeAccountingSnapshotInput): AccountingSnapshot {
  const { operations, payroll } = input;
  const balanceSnapshot = calculateCashBalance(operations);
  const now = new Date();
  const monthlyRevenue = sumIncomeInMonth(operations, now);
  const monthlyExpenses = sumExpensesInMonth(operations, now);
  const profit = monthlyRevenue - monthlyExpenses;
  const trend = buildBalanceTrend(operations);
  const growing = trend.length >= 2 ? trend[trend.length - 1] >= trend[trend.length - 2] : profit >= 0;

  return {
    balance: {
      available: balanceSnapshot.total,
      monthlyRevenue,
      monthlyExpenses,
      profit,
      trend,
      growing,
    },
    summary: buildSummaryCards(operations, payroll, now),
    quickActions: accountingQuickActions,
    attention: buildAttentionItems(operations, payroll, balanceSnapshot.total),
    transactions: buildTransactions(operations),
    cashFlow: buildCashFlow(operations),
    invoices: buildInvoices(operations, payroll),
    topCustomers: buildTopCustomers(operations),
    expenses: buildExpenseCategories(operations),
  };
}

export function emptyAccountingSnapshot(): AccountingSnapshot {
  return computeAccountingSnapshot({ operations: [], payroll: [] });
}
