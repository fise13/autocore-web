import type { ScanInventoryStatus } from '../types';

export const scanStatusLabel: Record<ScanInventoryStatus, string> = {
  in_stock: 'In Stock',
  reserved: 'Reserved',
  sold: 'Sold',
  deficit: 'Deficit',
  ready: 'Ready for Pickup',
  pending_delivery: 'Awaiting Delivery',
};

export const scanStatusTone: Record<
  ScanInventoryStatus,
  'success' | 'warning' | 'destructive' | 'secondary'
> = {
  in_stock: 'success',
  reserved: 'warning',
  sold: 'secondary',
  deficit: 'destructive',
  ready: 'success',
  pending_delivery: 'warning',
};
