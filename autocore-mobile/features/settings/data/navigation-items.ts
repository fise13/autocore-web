import {
  BarChart3Icon,
  ClipboardListIcon,
  CoinsIcon,
  FileStackIcon,
  FileTextIcon,
  LayoutGridIcon,
  PackageIcon,
  ReceiptIcon,
  ScanLineIcon,
  SearchIcon,
  SettingsIcon,
  ShoppingCartIcon,
  StoreIcon,
  UserRoundIcon,
} from '@/assets/icons';

import type { NavItemId } from '../types';

export type NavItemDefinition = {
  id: NavItemId;
  title: string;
  description: string;
  icon: typeof LayoutGridIcon;
  route?: string;
};

export const NAV_ITEM_DEFINITIONS: Record<NavItemId, NavItemDefinition> = {
  mission: {
    id: 'mission',
    title: 'Mission',
    description: 'Business overview and key metrics',
    icon: LayoutGridIcon,
    route: '/(tabs)',
  },
  search: {
    id: 'search',
    title: 'Search',
    description: 'Quick search across warehouse and catalog',
    icon: SearchIcon,
    route: '/warehouse',
  },
  scan: {
    id: 'scan',
    title: 'Scan',
    description: 'QR and barcodes for receiving',
    icon: ScanLineIcon,
    route: '/(tabs)/scan',
  },
  orders: {
    id: 'orders',
    title: 'Orders',
    description: 'Work orders and statuses',
    icon: FileTextIcon,
    route: '/(tabs)/orders',
  },
  my_earnings: {
    id: 'my_earnings',
    title: 'Shift',
    description: 'Orders, queue, and earnings',
    icon: CoinsIcon,
    route: '/(tabs)/profile/my-earnings',
  },
  profile: {
    id: 'profile',
    title: 'Settings',
    description: 'Profile and configuration',
    icon: UserRoundIcon,
    route: '/(tabs)/profile',
  },
  accounting: {
    id: 'accounting',
    title: 'Finance',
    description: 'Finances, invoices, and reports',
    icon: ReceiptIcon,
    route: '/(tabs)/accounting',
  },
  warehouse: {
    id: 'warehouse',
    title: 'Warehouse',
    description: 'Stock, bins, and movements',
    icon: PackageIcon,
    route: '/(tabs)/profile/modules',
  },
  sales: {
    id: 'sales',
    title: 'Sales',
    description: 'Deals, customers, and pipeline',
    icon: ShoppingCartIcon,
    route: '/(tabs)/profile/modules',
  },
  documents: {
    id: 'documents',
    title: 'Documents',
    description: 'Reports, contracts, and templates',
    icon: FileStackIcon,
    route: '/(tabs)/profile/modules',
  },
  inventory: {
    id: 'inventory',
    title: 'Inventory Count',
    description: 'Recounts and stock reconciliation',
    icon: ClipboardListIcon,
    route: '/(tabs)/profile/modules',
  },
  settings: {
    id: 'settings',
    title: 'Configuration',
    description: 'Advanced system settings',
    icon: SettingsIcon,
    route: '/(tabs)/profile',
  },
};

export const DEFAULT_NAV_ORDER: NavItemId[] = [
  'orders',
  'my_earnings',
  'search',
  'scan',
  'accounting',
  'profile',
  'mission',
  'warehouse',
  'sales',
  'documents',
  'inventory',
  'settings',
];

export const DEFAULT_NAV_ENABLED: Record<NavItemId, boolean> = {
  mission: true,
  search: true,
  scan: true,
  orders: true,
  my_earnings: true,
  accounting: true,
  profile: true,
  warehouse: false,
  sales: false,
  documents: false,
  inventory: false,
  settings: false,
};

export const MORE_TAB_ID = '__more__' as const;
