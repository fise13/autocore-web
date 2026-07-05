import type { ComponentType } from 'react';

import {
  CarIcon,
  ClipboardListIcon,
  FileStackIcon,
  FileTextIcon,
  PackageIcon,
  ReceiptIcon,
  ShoppingCartIcon,
  UserRoundIcon,
} from '@/assets/icons';

import type { SearchResultKind } from '../types';

type SearchIconProps = {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  strokeWidth?: number;
};

export function iconForSearchKind(kind: SearchResultKind): ComponentType<SearchIconProps> {
  switch (kind) {
    case 'motor':
    case 'engine':
      return CarIcon;
    case 'part':
      return PackageIcon;
    case 'client':
      return UserRoundIcon;
    case 'order':
      return FileTextIcon;
    case 'document':
      return FileStackIcon;
    case 'accounting':
      return ReceiptIcon;
    case 'sale':
      return ShoppingCartIcon;
    case 'vehicle':
      return CarIcon;
    case 'gearbox':
      return PackageIcon;
    default:
      return ClipboardListIcon;
  }
}
