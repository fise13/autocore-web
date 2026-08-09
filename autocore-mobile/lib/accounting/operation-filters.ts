import type { FinancialOperation } from '@/types/financial-operation';
import { operationTouchesAccount } from '@/lib/accounting/mixed-payment';

const WORK_ORDER_CATEGORIES = new Set(['work_order_income', 'work_order_parts_cost', 'payroll']);

export function filterExpenseOperations(operations: FinancialOperation[]): FinancialOperation[] {
  return operations.filter((item) => item.type === 'expense');
}

export function filterCashboxOperations(operations: FinancialOperation[]): FinancialOperation[] {
  return operations.filter((item) => operationTouchesAccount(item, 'cashbox'));
}

export function filterWorkOrderOperations(operations: FinancialOperation[]): FinancialOperation[] {
  return operations.filter(
    (item) => Boolean(item.relatedWorkOrderId) || WORK_ORDER_CATEGORIES.has(item.category ?? ''),
  );
}

export function filterPayrollExpenseOperations(operations: FinancialOperation[]): FinancialOperation[] {
  return operations.filter((item) => item.category === 'payroll');
}
