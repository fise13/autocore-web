import type { ScanInventoryStatus } from '../types';

export const scanStatusLabel: Record<ScanInventoryStatus, string> = {
  in_stock: 'В наличии',
  reserved: 'В резерве',
  sold: 'Продан',
  deficit: 'Дефицит',
  ready: 'Готов к выдаче',
  pending_delivery: 'Ожидает поставку',
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
