import type { ComponentType } from 'react';

export type OrderStatus =
  | 'in_progress'
  | 'waiting_parts'
  | 'ready'
  | 'completed'
  | 'overdue'
  | 'warranty';

export type OrderPriority = 'normal' | 'high';

export type OrderFilterId = 'all' | 'open' | 'done' | 'free';

export type OrderTimelineEvent = {
  id: string;
  title: string;
  time: string;
  done: boolean;
};

export type WorkOrder = {
  id: string;
  number: string;
  customer: string;
  phone?: string;
  vehicle: string;
  engine: string;
  licensePlate?: string;
  vin?: string;
  assignee?: string;
  isUnassigned?: boolean;
  isAssignedToMe?: boolean;
  price: number;
  status: OrderStatus;
  priority: OrderPriority;
  progress: number;
  estimated: string;
  createdAt: string;
  timeline: OrderTimelineEvent[];
  partsNote?: string;
  paymentNote?: string;
  warrantyNote?: string;
};

export type OrderFilterOption = {
  id: OrderFilterId;
  label: string;
};

export type OrdersListMeta = {
  total: number;
  openCount: number;
  freeCount?: number;
};

export type TodayOverview = {
  total: number;
  active: number;
  ready: number;
  waitingParts: number;
  overdue: number;
  completed: number;
  inProgress: number;
  salesToday: number;
  salesDelta: number;
};

export type OrderActivityTone = 'primary' | 'success' | 'warning' | 'muted';

export type OrderActivity = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  tone: OrderActivityTone;
};
