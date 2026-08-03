import {
  OperationAccount,
  OperationType,
  PaymentMethod,
} from "@/domain/financial-operation";
import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";
import { userCopy } from "@/lib/user-copy";
import { userCopyEn } from "@/lib/user-copy.en";
import { userCopyRu } from "@/lib/user-copy.ru";

const CATEGORY_KEYS = [
  MOTOR_SALE_CATEGORY,
  "work_order",
  "work_order_income",
  "work_order_parts_cost",
  "payroll",
  "motor_import",
  "warehouse_import",
  "advertising",
  "transport",
  "food",
  "purchase",
  "logistics",
  "other",
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];

function categoryBundle(): Record<CategoryKey, string> {
  return userCopy.accounting.categories as Record<CategoryKey, string>;
}

/** Live labels — read via getters so locale switches apply without module remount freezes. */
export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  get sale() {
    return userCopy.accounting.operationTypes.sale;
  },
  get income() {
    return userCopy.accounting.operationTypes.income;
  },
  get expense() {
    return userCopy.accounting.operationTypes.expense;
  },
  get refund() {
    return userCopy.accounting.operationTypes.refund;
  },
  get transfer() {
    return userCopy.accounting.operationTypes.transfer;
  },
};

export const OPERATION_ACCOUNT_LABELS: Record<OperationAccount, string> = {
  get cashbox() {
    return userCopy.accounting.accounts.cashbox;
  },
  get kaspi() {
    return userCopy.accounting.accounts.kaspi;
  },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  get cash() {
    return userCopy.accounting.paymentMethods.cash;
  },
  get transfer() {
    return userCopy.accounting.paymentMethods.transfer;
  },
  get mixed() {
    return userCopy.accounting.paymentMethods.mixed;
  },
};

/** Canonical Firestore keys → labels shown in UI (live). */
export const OPERATION_CATEGORY_LABELS: Record<string, string> = {
  get [MOTOR_SALE_CATEGORY]() {
    return userCopy.accounting.categories.motor_sale;
  },
  get work_order() {
    return userCopy.accounting.categories.work_order;
  },
  get work_order_income() {
    return userCopy.accounting.categories.work_order_income;
  },
  get work_order_parts_cost() {
    return userCopy.accounting.categories.work_order_parts_cost;
  },
  get payroll() {
    return userCopy.accounting.categories.payroll;
  },
  get motor_import() {
    return userCopy.accounting.categories.motor_import;
  },
  get warehouse_import() {
    return userCopy.accounting.categories.warehouse_import;
  },
  get advertising() {
    return userCopy.accounting.categories.advertising;
  },
  get transport() {
    return userCopy.accounting.categories.transport;
  },
  get food() {
    return userCopy.accounting.categories.food;
  },
  get purchase() {
    return userCopy.accounting.categories.purchase;
  },
  get logistics() {
    return userCopy.accounting.categories.logistics;
  },
  get other() {
    return userCopy.accounting.categories.other;
  },
};

const OPERATION_CATEGORY_LABEL_LOOKUP = new Map<string, string>();
for (const bundle of [userCopyEn, userCopyRu]) {
  for (const [key, label] of Object.entries(bundle.accounting.categories)) {
    OPERATION_CATEGORY_LABEL_LOOKUP.set(label.toLowerCase(), key);
  }
}

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
  return categoryBundle()[trimmed as CategoryKey] ?? trimmed;
}

export function operationCategoryDisplayValue(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return "";
  return categoryBundle()[trimmed as CategoryKey] ?? trimmed;
}

export function resolveOperationCategoryValue(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (trimmed in categoryBundle()) return trimmed;

  const fromLabel = OPERATION_CATEGORY_LABEL_LOOKUP.get(trimmed.toLowerCase());
  if (fromLabel) return fromLabel;

  return trimmed;
}

export function isKnownOperationCategory(category: string): boolean {
  return category.trim() in categoryBundle();
}
