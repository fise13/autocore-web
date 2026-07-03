import type { InventoryStatus } from '../types';

export const statusLabel: Record<InventoryStatus, string> = {
  in_stock: 'В наличии',
  reserved: 'В резерве',
  sold: 'Продан',
  deficit: 'Дефицит',
  ready: 'Готов к выдаче',
  pending_delivery: 'Ожидает поставку',
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
