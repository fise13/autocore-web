import type { DemoPermission, PermissionGroupId } from '../types';

export const PERMISSION_GROUPS: Record<
  PermissionGroupId,
  { title: string; permissions: DemoPermission[] }
> = {
  warehouse: {
    title: 'Warehouse',
    permissions: [
      { id: 'warehouse.view', label: 'View warehouse', description: 'Stock and bin locations' },
      { id: 'warehouse.receive', label: 'Receiving', description: 'Log incoming goods' },
      { id: 'warehouse.ship', label: 'Shipping', description: 'Write-offs and transfers' },
      { id: 'warehouse.adjust', label: 'Adjustments', description: 'Stocktakes and corrections' },
    ],
  },
  sales: {
    title: 'Sales',
    permissions: [
      { id: 'sales.view', label: 'View deals', description: 'Pipeline and customers' },
      { id: 'sales.create', label: 'Create deals', description: 'New quotes' },
      { id: 'sales.discount', label: 'Discounts', description: 'Manage discounts' },
      { id: 'sales.close', label: 'Close deals', description: 'Finalize sales' },
    ],
  },
  orders: {
    title: 'Work Orders',
    permissions: [
      { id: 'orders.view', label: 'View work orders', description: 'All work orders' },
      { id: 'orders.create', label: 'Create', description: 'New work orders' },
      { id: 'orders.assign', label: 'Assign', description: 'Assign to mechanics' },
      { id: 'orders.close', label: 'Close', description: 'Complete work' },
    ],
  },
  accounting: {
    title: 'Accounting',
    permissions: [
      { id: 'accounting.view', label: 'View', description: 'Financial transactions' },
      { id: 'accounting.create', label: 'Create', description: 'New entries' },
      { id: 'accounting.export', label: 'Export', description: 'Export reports' },
      { id: 'accounting.delete', label: 'Delete', description: 'Dangerous operations' },
    ],
  },
  analytics: {
    title: 'Analytics',
    permissions: [
      { id: 'analytics.view', label: 'View', description: 'Dashboards and KPIs' },
      { id: 'analytics.export', label: 'Export', description: 'Export analytics' },
      { id: 'analytics.financial', label: 'Financials', description: 'Sensitive metrics' },
    ],
  },
  documents: {
    title: 'Documents',
    permissions: [
      { id: 'documents.view', label: 'View', description: 'Document archive' },
      { id: 'documents.create', label: 'Create', description: 'New templates' },
      { id: 'documents.sign', label: 'Sign', description: 'Electronic signature' },
    ],
  },
  settings: {
    title: 'Settings',
    permissions: [
      { id: 'settings.view', label: 'View', description: 'Company configuration' },
      { id: 'settings.manage', label: 'Manage', description: 'Change settings' },
      { id: 'settings.branding', label: 'Branding', description: 'Logo and appearance' },
    ],
  },
  admin: {
    title: 'Administration',
    permissions: [
      { id: 'admin.users', label: 'Users', description: 'Manage the team' },
      { id: 'admin.roles', label: 'Roles', description: 'Create roles' },
      { id: 'admin.billing', label: 'Billing', description: 'Subscription and payment' },
      { id: 'admin.danger', label: 'Danger zone', description: 'Delete data' },
    ],
  },
};

export const ACCOUNTING_DEMO = {
  currency: { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
  defaultTax: { rate: '12%', label: 'VAT', inclusive: false },
  financialYear: { start: 'January 1', end: 'December 31', current: '2026' },
  expenseCategories: ['Rent', 'Payroll', 'Parts', 'Logistics', 'Marketing', 'Utilities'],
  incomeCategories: ['Repairs', 'Engine sales', 'Diagnostics', 'Warranty work'],
  salaryTracking: { enabled: true, employees: 12, lastPayroll: 'June 28, 2026' },
  payroll: { cycle: 'Monthly', nextRun: 'July 28, 2026', method: 'Bank transfer' },
  suppliers: [
    { name: 'MotorParts KZ', balance: '₸ 1,240,000', status: 'Active' },
    { name: 'Asia Auto Supply', balance: '₸ 380,500', status: 'Active' },
    { name: 'EuroGear GmbH', balance: '€ 12,400', status: 'Pending' },
  ],
  exportFormats: ['1C', 'Excel', 'PDF', 'CSV'],
  invoices: { draft: 3, sent: 18, paid: 142, overdue: 2 },
  paymentMethods: ['Cash', 'Card', 'Bank transfer', 'Halyk Terminal'],
};
