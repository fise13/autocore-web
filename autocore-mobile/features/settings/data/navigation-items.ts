import {
  BarChart3Icon,
  ClipboardListIcon,
  FileStackIcon,
  FileTextIcon,
  LayoutGridIcon,
  PackageIcon,
  ReceiptIcon,
  ScanSearchIcon,
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
    description: 'Обзор бизнеса и ключевые метрики',
    icon: LayoutGridIcon,
    route: '/(tabs)',
  },
  search: {
    id: 'search',
    title: 'Поиск',
    description: 'Быстрый поиск по складу и каталогу',
    icon: SearchIcon,
    route: '/(tabs)/search',
  },
  scan: {
    id: 'scan',
    title: 'Сканирование',
    description: 'QR и штрихкоды для приёмки',
    icon: ScanSearchIcon,
    route: '/(tabs)/scan',
  },
  orders: {
    id: 'orders',
    title: 'Наряды',
    description: 'Рабочие заказы и статусы',
    icon: FileTextIcon,
    route: '/(tabs)/orders',
  },
  profile: {
    id: 'profile',
    title: 'Настройки',
    description: 'Профиль и конфигурация',
    icon: UserRoundIcon,
    route: '/(tabs)/profile',
  },
  accounting: {
    id: 'accounting',
    title: 'Финансы',
    description: 'Финансы, счета и отчёты',
    icon: ReceiptIcon,
    route: '/(tabs)/accounting',
  },
  warehouse: {
    id: 'warehouse',
    title: 'Склад',
    description: 'Остатки, ячейки и движения',
    icon: PackageIcon,
    route: '/(tabs)/profile/modules',
  },
  sales: {
    id: 'sales',
    title: 'Продажи',
    description: 'Сделки, клиенты и воронка',
    icon: ShoppingCartIcon,
    route: '/(tabs)/profile/modules',
  },
  documents: {
    id: 'documents',
    title: 'Документы',
    description: 'Акты, договоры и шаблоны',
    icon: FileStackIcon,
    route: '/(tabs)/profile/modules',
  },
  inventory: {
    id: 'inventory',
    title: 'Инвентаризация',
    description: 'Пересчёт и сверка остатков',
    icon: ClipboardListIcon,
    route: '/(tabs)/profile/modules',
  },
  settings: {
    id: 'settings',
    title: 'Конфигурация',
    description: 'Расширенные настройки системы',
    icon: SettingsIcon,
    route: '/(tabs)/profile',
  },
};

export const DEFAULT_NAV_ORDER: NavItemId[] = [
  'mission',
  'search',
  'scan',
  'orders',
  'accounting',
  'profile',
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
  accounting: true,
  profile: true,
  warehouse: false,
  sales: false,
  documents: false,
  inventory: false,
  settings: false,
};

export const MORE_TAB_ID = '__more__' as const;
