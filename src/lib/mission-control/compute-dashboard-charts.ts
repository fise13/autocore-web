import { subDays, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { format } from "date-fns";

import { FinancialOperation } from "@/domain/financial-operation";
import { InventoryItem } from "@/domain/inventory";
import { WorkOrder } from "@/domain/work-order";
import { MissionControlOverviewMetrics } from "@/lib/mission-control/compute-overview-metrics";

export type DailyRevenueRow = {
  day: string;
  label: string;
  revenue: number;
};

export type IncomeExpenseRow = {
  day: string;
  label: string;
  income: number;
  expense: number;
};

export type DashboardStatDeltaKind = "percent" | "count" | "none";

export type DashboardStat = {
  key: string;
  label: string;
  value: string;
  delta: number;
  deltaKind: DashboardStatDeltaKind;
  hint: string;
};

function isIncomeOperation(operation: FinancialOperation): boolean {
  return operation.type === "sale" || operation.type === "income";
}

function isExpenseOperation(operation: FinancialOperation): boolean {
  return operation.type === "expense";
}

function sumInRange(
  operations: FinancialOperation[],
  from: Date,
  to: Date,
  predicate: (operation: FinancialOperation) => boolean,
): number {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  return operations
    .filter((operation) => {
      const ts = operation.createdAt.getTime();
      return ts >= fromMs && ts <= toMs && predicate(operation);
    })
    .reduce((sum, operation) => sum + operation.amount, 0);
}

export function growthPercent(first: number, last: number): number {
  if (!first) return last > 0 ? 100 : 0;
  return ((last - first) / first) * 100;
}

export function buildDailyRevenueSeries(
  operations: FinancialOperation[],
  days = 7,
): DailyRevenueRow[] {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => {
    const day = subDays(today, days - 1 - index);
    const key = day.toDateString();
    const revenue = operations
      .filter(
        (operation) =>
          operation.createdAt.toDateString() === key && isIncomeOperation(operation),
      )
      .reduce((sum, operation) => sum + operation.amount, 0);

    return {
      day: format(day, "EEE", { locale: ru }),
      label: format(day, "d MMM", { locale: ru }),
      revenue,
    };
  });
}

export function buildIncomeExpenseSeries(
  operations: FinancialOperation[],
  days = 14,
): IncomeExpenseRow[] {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => {
    const day = subDays(today, days - 1 - index);
    const key = day.toDateString();
    const dayOperations = operations.filter(
      (operation) => operation.createdAt.toDateString() === key,
    );

    const income = dayOperations
      .filter(isIncomeOperation)
      .reduce((sum, operation) => sum + operation.amount, 0);
    const expense = dayOperations
      .filter(isExpenseOperation)
      .reduce((sum, operation) => sum + operation.amount, 0);

    return {
      day: format(day, "d MMM", { locale: ru }),
      label: format(day, "d MMM", { locale: ru }),
      income,
      expense,
    };
  });
}

export function computeRevenueDelta(operations: FinancialOperation[]): number {
  const today = startOfDay(new Date());
  const thisWeekStart = subDays(today, 6);
  const prevWeekEnd = subDays(thisWeekStart, 1);
  const prevWeekStart = subDays(prevWeekEnd, 6);

  const thisWeek = sumInRange(operations, thisWeekStart, today, isIncomeOperation);
  const prevWeek = sumInRange(operations, prevWeekStart, prevWeekEnd, isIncomeOperation);
  return growthPercent(prevWeek, thisWeek);
}

export function buildDashboardStats(input: {
  metrics: MissionControlOverviewMetrics;
  operations: FinancialOperation[];
  permissions: {
    canAccounting: boolean;
    canMotors: boolean;
    canWarehouse: boolean;
    canEmployees: boolean;
  };
  formatMoney?: (value: number) => string;
}): DashboardStat[] {
  const { metrics, operations, permissions } = input;
  const formatMoney =
    input.formatMoney ?? ((value: number) => `${value.toLocaleString("ru-RU")} ₸`);
  const revenueDelta = computeRevenueDelta(operations);
  const stats: DashboardStat[] = [];

  if (permissions.canAccounting) {
    stats.push({
      key: "revenue",
      label: "Выручка сегодня",
      value: formatMoney(metrics.todayRevenue),
      delta: revenueDelta,
      deltaKind: "percent",
      hint: "к прошлой неделе",
    });
    stats.push({
      key: "balance",
      label: "Баланс",
      value: formatMoney(metrics.totalBalance),
      delta: growthPercent(
        metrics.todayExpenses,
        metrics.todayRevenue - metrics.todayExpenses,
      ),
      deltaKind: "percent",
      hint: "чистый поток сегодня",
    });
  }

  if (permissions.canMotors) {
    stats.push({
      key: "motors",
      label: "Моторы",
      value: String(metrics.activeInventoryCount),
      delta: metrics.lowStockCount > 0 ? -metrics.lowStockCount : 0,
      deltaKind: metrics.lowStockCount > 0 ? "count" : "none",
      hint: metrics.lowStockCount > 0 ? `${metrics.lowStockCount} с низким остатком` : "в наличии",
    });
  }

  if (permissions.canWarehouse) {
    stats.push({
      key: "warehouse",
      label: "Склад",
      value: String(metrics.warehouseItemCount),
      delta: metrics.warehouseLowStockCount > 0 ? -metrics.warehouseLowStockCount : 0,
      deltaKind: metrics.warehouseLowStockCount > 0 ? "count" : "none",
      hint: `${formatMoney(metrics.warehouseStockValue)} остатков`,
    });
  }

  if (permissions.canEmployees) {
    stats.push({
      key: "online",
      label: "Команда онлайн",
      value: `${metrics.onlineEmployeesCount} / ${metrics.activeEmployeesCount}`,
      delta: metrics.changesToday,
      deltaKind: metrics.changesToday > 0 ? "count" : "none",
      hint: `${metrics.changesToday} изменений сегодня`,
    });
  }

  if (stats.length === 0) {
    stats.push({
      key: "activity",
      label: "Изменений сегодня",
      value: String(metrics.changesToday),
      delta: 0,
      deltaKind: "none",
      hint: "активность в системе",
    });
  }

  return stats.slice(0, 4);
}

export function countLowStockIssues(
  warehouseItems: InventoryItem[],
  motorLowStock: number,
): number {
  const warehouseLow = warehouseItems.filter((item) => {
    if (item.status !== "active") return false;
    return item.totalAvailable <= (item.lowStockThreshold ?? 1);
  }).length;
  return warehouseLow + motorLowStock;
}

export function formatMoneyKztFallback(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₸`;
}

export type DailyWorkOrderRow = {
  day: string;
  label: string;
  count: number;
};

export function buildWorkOrdersDailySeries(workOrders: WorkOrder[], days = 7): DailyWorkOrderRow[] {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => {
    const day = subDays(today, days - 1 - index);
    const key = day.toDateString();
    const count = workOrders.filter((order) => order.createdAt.toDateString() === key).length;

    return {
      day: format(day, "EEE", { locale: ru }),
      label: format(day, "d MMM", { locale: ru }),
      count,
    };
  });
}
