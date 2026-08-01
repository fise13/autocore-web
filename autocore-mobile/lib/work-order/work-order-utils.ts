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
  draft: 'Draft',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  waiting_parts: 'Waiting on Parts',
  completed: 'Completed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
