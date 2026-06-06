import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";

/** Canonical category keys stored in Firestore. */
export const ACCOUNTING_CATEGORY_SUGGESTIONS = [
  MOTOR_SALE_CATEGORY,
  "work_order_income",
  "work_order_parts_cost",
  "payroll",
  "реклама",
  "транспорт",
  "еда",
  "закупка",
  "логистика",
  "прочее",
] as const;
