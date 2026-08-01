import type { ComponentType } from 'react';

import type { WorkOrderStatus } from '@/types/work-order';

/** Mobile list/detail status — same vocabulary as domain. */
export type OrderStatus = WorkOrderStatus;

export type OrderPriority = 'normal' | 'high';

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
  /**
   * Raw `updatedAt` epoch — display strings cannot be grouped or sorted.
   * Optional because fixtures carry no timestamp; those fall to "Earlier".
   */
  updatedAtMs?: number;
  /** True when status is completed/delivered and completedAt/updatedAt is today. */
  closedToday?: boolean;
  timeline: OrderTimelineEvent[];
  partsNote?: string;
  paymentNote?: string;
  warrantyNote?: string;
};

export type OrderFilterId = 'all' | 'open' | 'in_progress' | 'waiting' | 'done' | 'free';

export type OrderFilterOption = {
  id: OrderFilterId;
  label: string;
};

export type OrdersListMeta = {
  total: number;
  openCount: number;
  inProgressCount: number;
  waitingCount: number;
  closedTodayCount: number;
  freeCount?: number;
  /** Calendar-day closed value — the one number the filter chips cannot show. */
  closedTodayRevenue?: number;
};

export type TodayOverview = {
  total: number;
  active: number;
  ready: number;
  waitingParts: number;
  overdue: number;
  completed: number;
  inProgress: number;
  /** Calendar-day closed revenue — not lifetime completed totals. */
  closedRevenueToday: number;
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
