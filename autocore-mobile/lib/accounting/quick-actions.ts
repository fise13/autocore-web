import {
  CarIcon,
  CoinsIcon,
  FileTextIcon,
  PackageIcon,
  ReceiptIcon,
  StoreIcon,
  TagIcon,
  TrendingUpIcon,
  UsersIcon,
  WrenchIcon,
} from '@/assets/icons';
import type { AccountingSnapshot } from '@/features/accounting/types';

export const accountingQuickActions: AccountingSnapshot['quickActions'] = [
  { id: 'invoice', label: 'Счёт', icon: FileTextIcon, primary: true },
  { id: 'payment', label: 'Оплата', icon: CoinsIcon },
  { id: 'expense', label: 'Расход', icon: ReceiptIcon },
  { id: 'salary', label: 'Зарплата', icon: UsersIcon },
  { id: 'export', label: 'Экспорт', icon: TrendingUpIcon },
  { id: 'transfer', label: 'Перевод', icon: PackageIcon },
];

export const CATEGORY_ICONS = {
  motor_sale: CarIcon,
  work_order_income: FileTextIcon,
  work_order_parts_cost: WrenchIcon,
  payroll: UsersIcon,
  logistics: PackageIcon,
  warehouse: StoreIcon,
  transport: CarIcon,
  fuel: TagIcon,
  advertising: TrendingUpIcon,
  office: FileTextIcon,
  taxes: ReceiptIcon,
  default: ReceiptIcon,
} as const;
