import {
  OperationAccount,
  OperationType,
  PaymentMethod,
} from "@/domain/financial-operation";

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  sale: "Продажа",
  income: "Приход",
  expense: "Расход",
  refund: "Возврат",
  transfer: "Перевод",
};

export const OPERATION_ACCOUNT_LABELS: Record<OperationAccount, string> = {
  cashbox: "Касса",
  kaspi: "Каспи",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Наличные",
  transfer: "Безнал",
  mixed: "Смешанная",
};

export const CREATABLE_OPERATION_TYPES = ["expense", "income", "sale", "refund"] as const;

export type CreatableOperationType = (typeof CREATABLE_OPERATION_TYPES)[number];

export function operationTypeLabel(type: OperationType | string): string {
  return OPERATION_TYPE_LABELS[type as OperationType] ?? String(type);
}

export function operationAccountLabel(account: OperationAccount | string): string {
  return OPERATION_ACCOUNT_LABELS[account as OperationAccount] ?? String(account);
}

export function paymentMethodLabel(method: PaymentMethod | string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? String(method);
}
