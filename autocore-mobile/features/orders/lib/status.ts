import type { OrderStatus } from '../types';

export const orderStatusLabel: Record<OrderStatus, string> = {
  in_progress: 'В работе',
  waiting_parts: 'Ждёт запчасти',
  ready: 'Готов',
  completed: 'Завершён',
  overdue: 'Просрочен',
  warranty: 'Гарантия',
};

export type OrderStatusTone = 'primary' | 'warning' | 'success' | 'destructive' | 'muted' | 'chart2';

export const orderStatusTone: Record<OrderStatus, OrderStatusTone> = {
  in_progress: 'primary',
  waiting_parts: 'warning',
  ready: 'success',
  completed: 'muted',
  overdue: 'destructive',
  warranty: 'chart2',
};
