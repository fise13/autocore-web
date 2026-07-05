import {
  FileTextIcon,
  CoinsIcon,
  PackageIcon,
  ReceiptIcon,
  TrendingUpIcon,
  UsersIcon,
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
