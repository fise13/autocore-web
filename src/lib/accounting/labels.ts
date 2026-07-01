import {
  OperationAccount,
  OperationType,
  PaymentMethod,
} from "@/domain/financial-operation";
import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";

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

/** Canonical Firestore keys → labels shown in UI. */
export const OPERATION_CATEGORY_LABELS: Record<string, string> = {
  [MOTOR_SALE_CATEGORY]: "Продажа мотора",
  work_order_income: "Доход заказ-наряда",
  work_order_parts_cost: "Себестоимость запчастей",
  payroll: "Зарплата",
  motor_import: "Закупка моторов",
  warehouse_import: "Закупка на склад",
};

const OPERATION_CATEGORY_LABEL_LOOKUP = new Map<string, string>(
  Object.entries(OPERATION_CATEGORY_LABELS).map(([key, label]) => [label.toLowerCase(), key]),
);

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

export function operationCategoryLabel(category: string | null | undefined): string {
  if (!category) return "—";
  const trimmed = category.trim();
  if (!trimmed) return "—";
  return OPERATION_CATEGORY_LABELS[trimmed] ?? trimmed;
}

export function operationCategoryDisplayValue(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return "";
  return OPERATION_CATEGORY_LABELS[trimmed] ?? trimmed;
}

export function resolveOperationCategoryValue(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (OPERATION_CATEGORY_LABELS[trimmed]) return trimmed;

  const fromLabel = OPERATION_CATEGORY_LABEL_LOOKUP.get(trimmed.toLowerCase());
  if (fromLabel) return fromLabel;

  return trimmed;
}

export function isKnownOperationCategory(category: string): boolean {
  return category.trim() in OPERATION_CATEGORY_LABELS;
}
