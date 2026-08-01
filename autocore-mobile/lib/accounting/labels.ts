import {
  OPERATION_ACCOUNTS,
  PAYMENT_METHODS,
  type OperationAccount,
  type OperationType,
  type PaymentMethod,
} from '@/types/financial-operation';

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  sale: 'Sale',
  income: 'Income',
  expense: 'Expense',
  refund: 'Refund',
  transfer: 'Transfer',
};

export const OPERATION_ACCOUNT_LABELS: Record<OperationAccount, string> = {
  cashbox: 'Cash',
  kaspi: 'Card',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  transfer: 'Bank transfer',
  mixed: 'Mixed',
};

export const OPERATION_CATEGORY_LABELS: Record<string, string> = {
  motor_sale: 'Engine sale',
  work_order_income: 'Work order income',
  work_order_parts_cost: 'Parts cost',
  payroll: 'Payroll',
  motor_import: 'Engine purchase',
  warehouse_import: 'Warehouse purchase',
};

export const CREATABLE_OPERATION_TYPES = ['expense', 'income', 'sale', 'refund'] as const;

export type CreatableOperationType = (typeof CREATABLE_OPERATION_TYPES)[number];

export const ACCOUNTING_CATEGORY_SUGGESTIONS = [
  'motor_sale',
  'work_order_income',
  'work_order_parts_cost',
  'payroll',
  'advertising',
  'transport',
  'food',
  'supplies',
  'logistics',
  'other',
] as const;

const OUTGOING_OPERATION_TYPES = new Set<OperationType>(['expense', 'refund']);

/** Cash direction of an operation — drives sign and tone in the UI. */
export function operationDirection(type: OperationType | string): 'in' | 'out' {
  return OUTGOING_OPERATION_TYPES.has(type as OperationType) ? 'out' : 'in';
}

export function operationTypeLabel(type: OperationType | string): string {
  return OPERATION_TYPE_LABELS[type as OperationType] ?? String(type);
}

export function operationAccountLabel(account: OperationAccount | string): string {
  return OPERATION_ACCOUNT_LABELS[account as OperationAccount] ?? String(account);
}

export function paymentMethodLabel(method: PaymentMethod | string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? String(method);
}

export function operationCategoryLabel(category: string | null | undefined): string {
  if (!category?.trim()) return '—';
  const trimmed = category.trim();
  return OPERATION_CATEGORY_LABELS[trimmed] ?? trimmed;
}

export function resolveOperationCategoryValue(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (OPERATION_CATEGORY_LABELS[trimmed]) return trimmed;
  const fromLabel = Object.entries(OPERATION_CATEGORY_LABELS).find(
    ([, label]) => label.toLowerCase() === trimmed.toLowerCase(),
  );
  return fromLabel?.[0] ?? trimmed;
}

export function creatableTypeOptions() {
  return CREATABLE_OPERATION_TYPES.map((value) => ({
    value,
    label: operationTypeLabel(value),
  }));
}

export function accountOptions() {
  return OPERATION_ACCOUNTS.map((value) => ({
    value,
    label: operationAccountLabel(value),
  }));
}

export function paymentMethodOptions() {
  return PAYMENT_METHODS.map((value) => ({
    value,
    label: paymentMethodLabel(value),
  }));
}
