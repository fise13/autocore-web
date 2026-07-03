import type { WorkOrderStatus } from '@/types/work-order';

export function isOpenStatus(status: WorkOrderStatus): boolean {
  return !['completed', 'delivered', 'cancelled'].includes(status);
}

export function nextStatuses(status: WorkOrderStatus): WorkOrderStatus[] {
  if (status === 'draft') return ['confirmed', 'cancelled'];
  if (status === 'confirmed') return ['in_progress', 'waiting_parts', 'cancelled'];
  if (status === 'in_progress') return ['waiting_parts', 'completed', 'cancelled'];
  if (status === 'waiting_parts') return ['in_progress', 'completed', 'cancelled'];
  if (status === 'completed') return ['delivered'];
  return [];
}

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: 'Черновик',
  confirmed: 'Подтверждён',
  in_progress: 'В работе',
  waiting_parts: 'Ожидание запчастей',
  completed: 'Выполнен',
  delivered: 'Выдан',
  cancelled: 'Отменён',
};
