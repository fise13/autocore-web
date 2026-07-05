import {
  CarIcon,
  FileTextIcon,
  PackageIcon,
  ReceiptIcon,
  StoreIcon,
  TagIcon,
  TrendingUpIcon,
  UsersIcon,
  WrenchIcon,
} from '@/assets/icons';

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
