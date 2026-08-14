import { format, isSameDay, startOfDay, subDays } from 'date-fns';

import { isAssignedToWorkOrder, isClaimableWorkOrder } from '@autocore/rbac';
import { isOpenStatus, STATUS_LABELS } from '@/lib/work-order/work-order-utils';
import type { PayrollTransactionStatus } from '@/types/payroll-transaction';
import type { WorkOrderStatus } from '@/types/work-order';

const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const CLOSED_FOR_TALLY = new Set<WorkOrderStatus>(['completed', 'delivered']);
const PAYOUT_STATUS_RANK: Record<PayrollTransactionStatus, number> = {
  pending: 0,
  paid: 1,
  cancelled: 2,
};

export const EARNINGS_PAYOUT_STATUS_LABELS: Record<PayrollTransactionStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export const EARNINGS_CLAIMABLE_PREVIEW = 4;
export const EARNINGS_OPEN_PREVIEW = 4;
export const EARNINGS_PAYOUT_PREVIEW = 12;

export type EarningsWorkOrder = {
  id: string;
  number: string;
  status: WorkOrderStatus;
  vehicleLabel?: string;
  clientName?: string;
  licensePlate?: string;
  laborLines?: Array<{ id?: string; assigneeIds?: string[] | null }> | null;
  completedAt?: Date;
  updatedAt?: Date;
};

export type EarningsPayrollRow = {
  id: string;
  amount: number;
  status: PayrollTransactionStatus;
  workOrderId: string;
  createdAt: Date;
  paidAt?: Date;
};

export type EarningsWeekDay = {
  key: string;
  label: string;
  count: number;
  isToday: boolean;
};

export type EarningsJobPreview = {
  id: string;
  number: string;
  title: string;
  detail: string;
  statusLabel: string;
};

export type EarningsPayoutPreview = {
  id: string;
  workOrderId: string;
  amount: number;
  status: PayrollTransactionStatus;
  workOrderLabel: string;
  dateLabel: string;
};

export type EarningsSnapshot = {
  pending: number;
  paid: number;
  myOpen: number;
  freePool: number;
  weekDays: EarningsWeekDay[];
  weekClosedCount: number;
  myOpenJobs: EarningsJobPreview[];
  claimableJobs: EarningsJobPreview[];
  payouts: EarningsPayoutPreview[];
};

export function localDayKey(date: Date): string {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

export function formatEarningsDate(date: Date, now = new Date()): string {
  if (isSameDay(date, now)) return 'Today';
  return format(date, 'd MMM');
}

function jobTitle(order: EarningsWorkOrder): string {
  return order.vehicleLabel?.trim() || order.clientName?.trim() || 'Work order';
}

function jobDetail(order: EarningsWorkOrder): string {
  return order.licensePlate?.trim() || 'No plate';
}

function toJobPreview(order: EarningsWorkOrder): EarningsJobPreview {
  return {
    id: order.id,
    number: order.number,
    title: jobTitle(order),
    detail: jobDetail(order),
    statusLabel: STATUS_LABELS[order.status],
  };
}

function buildWeekDays(completedByDay: Map<string, number>, now: Date): EarningsWeekDay[] {
  const today = startOfDay(now);
  const days: EarningsWeekDay[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = subDays(today, offset);
    const key = localDayKey(day);
    days.push({
      key,
      label: WEEKDAY_SHORT[day.getDay()] ?? '',
      count: completedByDay.get(key) ?? 0,
      isToday: offset === 0,
    });
  }
  return days;
}

export function buildEarningsSnapshot(params: {
  payroll: EarningsPayrollRow[];
  orders: EarningsWorkOrder[];
  uid: string | null | undefined;
  now?: Date;
  claimableLimit?: number;
  openLimit?: number;
  payoutLimit?: number;
}): EarningsSnapshot {
  const now = params.now ?? new Date();
  const claimableLimit = params.claimableLimit ?? EARNINGS_CLAIMABLE_PREVIEW;
  const openLimit = params.openLimit ?? EARNINGS_OPEN_PREVIEW;
  const payoutLimit = params.payoutLimit ?? EARNINGS_PAYOUT_PREVIEW;
  const windowStart = startOfDay(subDays(now, 6));

  let pending = 0;
  let paid = 0;
  for (const row of params.payroll) {
    if (row.status === 'paid') paid += row.amount;
    else if (row.status === 'pending') pending += row.amount;
  }

  const completedByDay = new Map<string, number>();
  const myOpenOrders: EarningsWorkOrder[] = [];
  const claimableOrders: EarningsWorkOrder[] = [];
  const ordersById = new Map(params.orders.map((order) => [order.id, order]));

  for (const order of params.orders) {
    if (isClaimableWorkOrder(order)) claimableOrders.push(order);
    if (params.uid && isAssignedToWorkOrder(order, params.uid) && isOpenStatus(order.status)) {
      myOpenOrders.push(order);
    }
    if (
      params.uid &&
      isAssignedToWorkOrder(order, params.uid) &&
      CLOSED_FOR_TALLY.has(order.status)
    ) {
      const closedAt = order.completedAt ?? order.updatedAt;
      if (closedAt && closedAt.getTime() >= windowStart.getTime() && closedAt.getTime() <= now.getTime()) {
        const key = localDayKey(closedAt);
        completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
      }
    }
  }

  const weekDays = buildWeekDays(completedByDay, now);

  const payouts = [...params.payroll]
    .sort((a, b) => {
      const rank = PAYOUT_STATUS_RANK[a.status] - PAYOUT_STATUS_RANK[b.status];
      if (rank !== 0) return rank;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, payoutLimit)
    .map((row) => {
      const order = ordersById.get(row.workOrderId);
      return {
        id: row.id,
        workOrderId: row.workOrderId,
        amount: row.amount,
        status: row.status,
        workOrderLabel: order ? `Work order #${order.number}` : 'Work order',
        dateLabel: formatEarningsDate(row.paidAt ?? row.createdAt, now),
      };
    });

  return {
    pending,
    paid,
    myOpen: myOpenOrders.length,
    freePool: claimableOrders.length,
    weekDays,
    weekClosedCount: weekDays.reduce((sum, day) => sum + day.count, 0),
    myOpenJobs: myOpenOrders.slice(0, openLimit).map(toJobPreview),
    claimableJobs: claimableOrders.slice(0, claimableLimit).map(toJobPreview),
    payouts,
  };
}
