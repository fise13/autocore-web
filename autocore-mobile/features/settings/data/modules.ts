import {
  BarChart3Icon,
  BoxIcon,
  CarIcon,
  ClipboardListIcon,
  FileStackIcon,
  FileTextIcon,
  PackageIcon,
  ReceiptIcon,
  ShoppingCartIcon,
  TagIcon,
  WrenchIcon,
} from '@/assets/icons';

import type { ProductModuleId } from '../types';

export type ModuleDefinition = {
  id: ProductModuleId;
  title: string;
  description: string;
  icon: typeof PackageIcon;
  companyModuleKey?: 'motors' | 'workOrders' | 'accounting' | 'warehouse' | 'specifics';
};

export const MODULE_DEFINITIONS: Record<ProductModuleId, ModuleDefinition> = {
  engines: {
    id: 'engines',
    title: 'Engines',
    description: 'Engine catalog, compatibility, and history',
    icon: CarIcon,
    companyModuleKey: 'motors',
  },
  orders: {
    id: 'orders',
    title: 'Work Orders',
    description: 'Work orders, stages, and assignments',
    icon: FileTextIcon,
    companyModuleKey: 'workOrders',
  },
  warehouse: {
    id: 'warehouse',
    title: 'Warehouse',
    description: 'Stock, bins, receiving, and shipping',
    icon: PackageIcon,
    companyModuleKey: 'warehouse',
  },
  sales: {
    id: 'sales',
    title: 'Sales',
    description: 'Deals, customers, and quotes',
    icon: ShoppingCartIcon,
  },
  accounting: {
    id: 'accounting',
    title: 'Accounting',
    description: 'Finances, taxes, payroll, and reports',
    icon: ReceiptIcon,
    companyModuleKey: 'accounting',
  },
  documents: {
    id: 'documents',
    title: 'Documents',
    description: 'Invoices, contracts, templates, and archive',
    icon: FileStackIcon,
  },
  expenses: {
    id: 'expenses',
    title: 'Expenses',
    description: 'Operating costs and categories',
    icon: TagIcon,
  },
  parts: {
    id: 'parts',
    title: 'Parts',
    description: 'Parts catalog and cross-reference numbers',
    icon: BoxIcon,
    companyModuleKey: 'specifics',
  },
  gearboxes: {
    id: 'gearboxes',
    title: 'Transmissions',
    description: 'Transmissions, repairs, and unit tracking',
    icon: WrenchIcon,
  },
  warranty: {
    id: 'warranty',
    title: 'Warranty',
    description: 'Warranty claims and templates',
    icon: ClipboardListIcon,
  },
  analytics: {
    id: 'analytics',
    title: 'Analytics',
    description: 'Dashboards, KPIs, and forecasts',
    icon: BarChart3Icon,
  },
};

export const DEFAULT_MODULE_ENABLED: Record<ProductModuleId, boolean> = {
  engines: true,
  orders: true,
  warehouse: true,
  sales: true,
  accounting: true,
  documents: true,
  expenses: true,
  parts: true,
  gearboxes: false,
  warranty: true,
  analytics: true,
};

export const MODULE_ORDER: ProductModuleId[] = [
  'engines',
  'orders',
  'warehouse',
  'sales',
  'accounting',
  'documents',
  'expenses',
  'parts',
  'gearboxes',
  'warranty',
  'analytics',
];
