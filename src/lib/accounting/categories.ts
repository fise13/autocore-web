export const MOTOR_SALE_CATEGORY = "motor_sale" as const;
export const USED_PART_SALE_CATEGORY = "used_part_sale" as const;

export const ACCOUNTING_SYSTEM_CATEGORIES = [
  MOTOR_SALE_CATEGORY,
  USED_PART_SALE_CATEGORY,
  "work_order",
  "work_order_income",
  "work_order_parts_cost",
  "payroll",
] as const;
