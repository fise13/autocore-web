export const ACCOUNTING_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'cashbox', label: 'Cash Box' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'operations', label: 'Transactions' },
  { value: 'work_orders', label: 'Work Orders' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'advances', label: 'Advances' },
] as const;

export type AccountingTab = (typeof ACCOUNTING_TABS)[number]['value'];
