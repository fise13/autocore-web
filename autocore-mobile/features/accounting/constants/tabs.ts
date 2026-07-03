export const ACCOUNTING_TABS = [
  { value: 'overview', label: 'Обзор' },
  { value: 'cashbox', label: 'Касса' },
  { value: 'expenses', label: 'Расходы' },
  { value: 'operations', label: 'Операции' },
  { value: 'work_orders', label: 'Заказ-наряды' },
  { value: 'payroll', label: 'Зарплаты' },
  { value: 'advances', label: 'Авансы' },
] as const;

export type AccountingTab = (typeof ACCOUNTING_TABS)[number]['value'];
