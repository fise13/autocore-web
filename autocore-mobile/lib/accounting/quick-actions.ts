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
  { id: 'invoice', label: 'Invoice', icon: FileTextIcon, primary: true },
  { id: 'payment', label: 'Payment', icon: CoinsIcon },
  { id: 'expense', label: 'Expense', icon: ReceiptIcon },
  { id: 'salary', label: 'Payroll', icon: UsersIcon },
  { id: 'export', label: 'Export', icon: TrendingUpIcon },
  { id: 'transfer', label: 'Transfer', icon: PackageIcon },
];
