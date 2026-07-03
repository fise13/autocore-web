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
    title: 'Двигатели',
    description: 'Каталог моторов, совместимость и история',
    icon: CarIcon,
    companyModuleKey: 'motors',
  },
  orders: {
    id: 'orders',
    title: 'Наряды',
    description: 'Рабочие заказы, этапы и назначения',
    icon: FileTextIcon,
    companyModuleKey: 'workOrders',
  },
  warehouse: {
    id: 'warehouse',
    title: 'Склад',
    description: 'Остатки, ячейки, приёмка и отгрузка',
    icon: PackageIcon,
    companyModuleKey: 'warehouse',
  },
  sales: {
    id: 'sales',
    title: 'Продажи',
    description: 'Сделки, клиенты и коммерческие предложения',
    icon: ShoppingCartIcon,
  },
  accounting: {
    id: 'accounting',
    title: 'Бухгалтерия',
    description: 'Финансы, налоги, зарплата и отчёты',
    icon: ReceiptIcon,
    companyModuleKey: 'accounting',
  },
  documents: {
    id: 'documents',
    title: 'Документы',
    description: 'Акты, договоры, шаблоны и архив',
    icon: FileStackIcon,
  },
  expenses: {
    id: 'expenses',
    title: 'Расходы',
    description: 'Операционные затраты и категории',
    icon: TagIcon,
  },
  parts: {
    id: 'parts',
    title: 'Запчасти',
    description: 'Каталог деталей и кросс-номера',
    icon: BoxIcon,
    companyModuleKey: 'specifics',
  },
  gearboxes: {
    id: 'gearboxes',
    title: 'Коробки',
    description: 'КПП, ремонт и учёт агрегатов',
    icon: WrenchIcon,
  },
  warranty: {
    id: 'warranty',
    title: 'Гарантия',
    description: 'Гарантийные случаи и шаблоны',
    icon: ClipboardListIcon,
  },
  analytics: {
    id: 'analytics',
    title: 'Аналитика',
    description: 'Дашборды, KPI и прогнозы',
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
