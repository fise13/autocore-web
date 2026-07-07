import { subDays, startOfDay, startOfMonth } from "date-fns";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { PayrollTransaction, PayrollTransactionStatus } from "@/domain/payroll-transaction";
import { WorkOrder } from "@/domain/work-order";
import {
  countOpenAssignedWorkOrders,
  filterWorkOrdersByScope,
  isAssignedToWorkOrder,
  isClaimableWorkOrder,
} from "@autocore/rbac";

export type WeekBar = {
  label: string;
  value: number;
};

export type EarningsDayRow = {
  day: string;
  label: string;
  amount: number;
};

export type StatusBreakdownSlice = {
  status: PayrollTransactionStatus;
  amount: number;
  count: number;
};

export type MyEarningsSummary = {
  pending: number;
  paid: number;
  cancelled: number;
  avgPerOrder: number;
  paidOrderCount: number;
  closedThisMonth: number;
  myOpen: number;
  freePool: number;
  growthPercent: number | null;
  earningsWeekBars: WeekBar[];
  earningsMonthSeries: EarningsDayRow[];
  productivityWeekBars: WeekBar[];
  statusBreakdown: StatusBreakdownSlice[];
};

const WEEKDAY_SHORT_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"] as const;

const CLOSED_STATUSES = new Set(["completed", "delivered"]);

function weekDayShortLabel(date: Date): string {
  return WEEKDAY_SHORT_RU[date.getDay()] ?? "";
}

function payrollEffectiveDate(row: PayrollTransaction): Date {
  return row.paidAt ?? row.createdAt;
}

function safePercent(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return ((numerator - denominator) / denominator) * 100;
}

export function buildWeekBarsFromMap(
  valueByDay: Map<string, number>,
  endDay: Date,
  days = 7,
): WeekBar[] {
  const bars: WeekBar[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(endDay);
    day.setDate(day.getDate() - offset);
    const key = day.toDateString();
    bars.push({
      label: weekDayShortLabel(day),
      value: valueByDay.get(key) ?? 0,
    });
  }
  return bars;
}

function sumPayrollInRange(
  transactions: PayrollTransaction[],
  from: Date,
  to: Date,
  status?: PayrollTransactionStatus,
): number {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  return transactions
    .filter((row) => {
      if (status && row.status !== status) return false;
      const ts = payrollEffectiveDate(row).getTime();
      return ts >= fromMs && ts <= toMs;
    })
    .reduce((sum, row) => sum + row.amount, 0);
}

export function computeMyEarningsSummary(input: {
  transactions: PayrollTransaction[];
  workOrders: WorkOrder[];
  uid: string;
  now?: Date;
}): MyEarningsSummary {
  const { transactions, workOrders, uid } = input;
  const now = input.now ?? new Date();
  const today = startOfDay(now);
  const monthStart = startOfMonth(now);

  let pending = 0;
  let paid = 0;
  let cancelled = 0;
  let paidOrderCount = 0;
  const paidWorkOrderIds = new Set<string>();

  for (const row of transactions) {
    if (row.status === "paid") {
      paid += row.amount;
      if (!paidWorkOrderIds.has(row.workOrderId)) {
        paidWorkOrderIds.add(row.workOrderId);
        paidOrderCount += 1;
      }
    } else if (row.status === "pending") {
      pending += row.amount;
    } else {
      cancelled += row.amount;
    }
  }

  const earningsByDay = new Map<string, number>();
  for (const row of transactions) {
    const date = payrollEffectiveDate(row);
    if (date.getTime() < subDays(today, 29).getTime()) continue;
    const key = date.toDateString();
    earningsByDay.set(key, (earningsByDay.get(key) ?? 0) + row.amount);
  }

  const completedByDay = new Map<string, number>();
  let closedThisMonth = 0;

  for (const order of workOrders) {
    if (!uid || !isAssignedToWorkOrder(order, uid)) continue;
    if (!CLOSED_STATUSES.has(order.status)) continue;

    const closedAt = order.completedAt ?? order.deliveredAt ?? order.updatedAt;
    if (!closedAt) continue;

    if (closedAt >= monthStart) closedThisMonth += 1;

    if (closedAt.getTime() >= subDays(today, 6).getTime()) {
      const key = closedAt.toDateString();
      completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
    }
  }

  const thisWeekStart = subDays(today, 6);
  const prevWeekEnd = subDays(thisWeekStart, 1);
  const prevWeekStart = subDays(prevWeekEnd, 6);

  const thisWeekPaid = sumPayrollInRange(transactions, thisWeekStart, today, "paid");
  const prevWeekPaid = sumPayrollInRange(transactions, prevWeekStart, prevWeekEnd, "paid");

  const statusBreakdown: StatusBreakdownSlice[] = (
    ["pending", "paid", "cancelled"] as const
  ).map((status) => {
    const rows = transactions.filter((row) => row.status === status);
    return {
      status,
      amount: rows.reduce((sum, row) => sum + row.amount, 0),
      count: rows.length,
    };
  });

  const earningsMonthSeries: EarningsDayRow[] = Array.from({ length: 30 }, (_, index) => {
    const day = subDays(today, 29 - index);
    const key = day.toDateString();
    return {
      day: format(day, "EEE", { locale: ru }),
      label: format(day, "d MMM", { locale: ru }),
      amount: earningsByDay.get(key) ?? 0,
    };
  });

  let myOpen = 0;
  let freePool = 0;
  for (const order of workOrders) {
    if (isClaimableWorkOrder(order)) freePool += 1;
  }
  myOpen = countOpenAssignedWorkOrders(workOrders, uid);

  return {
    pending,
    paid,
    cancelled,
    avgPerOrder: paidOrderCount > 0 ? paid / paidOrderCount : 0,
    paidOrderCount,
    closedThisMonth,
    myOpen,
    freePool,
    growthPercent: safePercent(thisWeekPaid, prevWeekPaid),
    earningsWeekBars: buildWeekBarsFromMap(earningsByDay, today, 7),
    earningsMonthSeries,
    productivityWeekBars: buildWeekBarsFromMap(completedByDay, today, 7),
    statusBreakdown,
  };
}

export type MyEarningsPeriod = "7d" | "30d" | "all";

export function filterPayrollTransactions(
  transactions: PayrollTransaction[],
  status: PayrollTransactionStatus | "all",
  period: MyEarningsPeriod,
  now = new Date(),
): PayrollTransaction[] {
  const today = startOfDay(now);
  let fromMs = 0;
  if (period === "7d") fromMs = subDays(today, 6).getTime();
  if (period === "30d") fromMs = subDays(today, 29).getTime();

  return transactions.filter((row) => {
    if (status !== "all" && row.status !== status) return false;
    if (period === "all") return true;
    return payrollEffectiveDate(row).getTime() >= fromMs;
  });
}

export function scopedWorkOrdersForEmployee(
  workOrders: WorkOrder[],
  uid: string,
): WorkOrder[] {
  return filterWorkOrdersByScope(workOrders, uid, "assigned_work_orders");
}

export function openAssignedOrders(workOrders: WorkOrder[], uid: string): WorkOrder[] {
  const openStatuses = new Set(["draft", "confirmed", "in_progress", "waiting_parts"]);
  return workOrders.filter(
    (order) =>
      openStatuses.has(order.status) && isAssignedToWorkOrder(order, uid),
  );
}

export function claimableOrders(workOrders: WorkOrder[]): WorkOrder[] {
  return workOrders.filter((order) => isClaimableWorkOrder(order));
}

export function waitingPartsAssignedCount(workOrders: WorkOrder[], uid: string): number {
  return workOrders.filter(
    (order) =>
      order.status === "waiting_parts" && isAssignedToWorkOrder(order, uid),
  ).length;
}

export function closedThisWeekCount(workOrders: WorkOrder[], uid: string, now = new Date()): number {
  const weekAgo = subDays(startOfDay(now), 6);
  let count = 0;
  for (const order of workOrders) {
    if (!isAssignedToWorkOrder(order, uid)) continue;
    if (!CLOSED_STATUSES.has(order.status)) continue;
    const closedAt = order.completedAt ?? order.deliveredAt ?? order.updatedAt;
    if (closedAt && closedAt >= weekAgo) count += 1;
  }
  return count;
}

export function buildClosedOrdersDailySeries(
  workOrders: WorkOrder[],
  uid: string,
  days = 7,
  now = new Date(),
): EarningsDayRow[] {
  const today = startOfDay(now);
  const completedByDay = new Map<string, number>();

  for (const order of workOrders) {
    if (!isAssignedToWorkOrder(order, uid)) continue;
    if (!CLOSED_STATUSES.has(order.status)) continue;
    const closedAt = order.completedAt ?? order.deliveredAt ?? order.updatedAt;
    if (!closedAt) continue;
    const key = closedAt.toDateString();
    completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
  }

  return Array.from({ length: days }, (_, index) => {
    const day = subDays(today, days - 1 - index);
    const key = day.toDateString();
    return {
      day: format(day, "EEE", { locale: ru }),
      label: format(day, "d MMM", { locale: ru }),
      amount: completedByDay.get(key) ?? 0,
    };
  });
}
