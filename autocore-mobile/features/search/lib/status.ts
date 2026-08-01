import type { InventoryStatus } from '../types';

export const statusLabel: Record<InventoryStatus, string> = {
  in_stock: 'In Stock',
  reserved: 'Reserved',
  sold: 'Sold',
  deficit: 'Backordered',
  ready: 'Ready for Pickup',
  pending_delivery: 'Awaiting Delivery',
};

export const statusVariant: Record<
  InventoryStatus,
  'success' | 'warning' | 'destructive' | 'secondary' | 'outline'
> = {
  in_stock: 'success',
  reserved: 'warning',
  sold: 'secondary',
  deficit: 'destructive',
  ready: 'success',
  pending_delivery: 'warning',
};
