import { subDays, startOfDay } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { format } from "date-fns";

import { FinancialOperation } from "@/domain/financial-operation";
import { InventoryItem } from "@/domain/inventory";
import type { InventoryGroupId } from "@/domain/inventory-taxonomy";
import { WorkOrder } from "@/domain/work-order";
import { mixedCashPortion, roundMoney } from "@/lib/accounting/mixed-payment";
import { OverviewOverviewMetrics } from "@/lib/overview/compute-overview-metrics";
import { getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";

export type DailyRevenueRow = {
  day: string;
  label: string;
  revenue: number;
};

export const INTERACTIVE_REVENUE_DAYS = 90;

export type InteractiveRevenueRow = {
  date: string;
  cashbox: number;
  kaspi: number;
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

function dateFnsLocale() {
  return getActiveUserCopyLocale() === "en" ? enUS : ru;
}

function numberLocale(): string {
  return getActiveUserCopyLocale() === "en" ? "en-US" : "ru-RU";
}

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
  const locale = dateFnsLocale();
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
      day: format(day, "EEE", { locale }),
      label: format(day, "d MMM", { locale }),
      revenue,
    };
  });
}

function incomeSplitByAccount(operation: FinancialOperation): { cashbox: number; kaspi: number } {
  if (!isIncomeOperation(operation)) return { cashbox: 0, kaspi: 0 };
  const cash = mixedCashPortion(operation);
  if (cash != null) {
    return { cashbox: cash, kaspi: roundMoney(operation.amount - cash) };
  }
  if (operation.account === "kaspi") return { cashbox: 0, kaspi: operation.amount };
  return { cashbox: operation.amount, kaspi: 0 };
}

export function buildInteractiveRevenueSeries(
  operations: FinancialOperation[],
  days = INTERACTIVE_REVENUE_DAYS,
): InteractiveRevenueRow[] {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => {
    const day = subDays(today, days - 1 - index);
    const key = day.toDateString();
    const split = operations
      .filter((operation) => operation.createdAt.toDateString() === key)
      .reduce(
        (acc, operation) => {
          const next = incomeSplitByAccount(operation);
          acc.cashbox += next.cashbox;
          acc.kaspi += next.kaspi;
          return acc;
        },
        { cashbox: 0, kaspi: 0 },
      );

    return {
      date: format(day, "yyyy-MM-dd"),
      cashbox: split.cashbox,
      kaspi: split.kaspi,
    };
  });
}

export function buildIncomeExpenseSeries(
  operations: FinancialOperation[],
  days = 14,
): IncomeExpenseRow[] {
  const today = startOfDay(new Date());
  const locale = dateFnsLocale();
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
      day: format(day, "d MMM", { locale }),
      label: format(day, "d MMM", { locale }),
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
  metrics: OverviewOverviewMetrics;
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
  const copy = userCopy.overview.dashboard.stats;
  const formatMoney =
    input.formatMoney ??
    ((value: number) => `$${value.toLocaleString(numberLocale())}`);
  const revenueDelta = computeRevenueDelta(operations);
  const stats: DashboardStat[] = [];

  if (permissions.canAccounting) {
    stats.push({
      key: "revenue",
      label: copy.revenueToday,
      value: formatMoney(metrics.todayRevenue),
      delta: revenueDelta,
      deltaKind: "percent",
      hint: copy.vsLastWeek,
    });
    stats.push({
      key: "balance",
      label: copy.balance,
      value: formatMoney(metrics.totalBalance),
      delta: growthPercent(
        metrics.todayExpenses,
        metrics.todayRevenue - metrics.todayExpenses,
      ),
      deltaKind: "percent",
      hint: copy.netFlowToday,
    });
  }

  if (permissions.canMotors) {
    stats.push({
      key: "motors",
      label: copy.motors,
      value: String(metrics.activeInventoryCount),
      delta: metrics.lowStockCount > 0 ? -metrics.lowStockCount : 0,
      deltaKind: metrics.lowStockCount > 0 ? "count" : "none",
      hint:
        metrics.lowStockCount > 0 ? copy.lowStock(metrics.lowStockCount) : copy.inStock,
    });
  }

  if (permissions.canWarehouse) {
    stats.push({
      key: "warehouse",
      label: copy.warehouse,
      value: String(metrics.warehouseItemCount),
      delta: metrics.warehouseLowStockCount > 0 ? -metrics.warehouseLowStockCount : 0,
      deltaKind: metrics.warehouseLowStockCount > 0 ? "count" : "none",
      hint: copy.stockValue(formatMoney(metrics.warehouseStockValue)),
    });
  }

  if (permissions.canEmployees) {
    stats.push({
      key: "online",
      label: copy.teamOnline,
      value: `${metrics.onlineEmployeesCount} / ${metrics.activeEmployeesCount}`,
      delta: metrics.changesToday,
      deltaKind: metrics.changesToday > 0 ? "count" : "none",
      hint: copy.changesToday(metrics.changesToday),
    });
  }

  if (stats.length === 0) {
    stats.push({
      key: "activity",
      label: copy.changesTodayLabel,
      value: String(metrics.changesToday),
      delta: 0,
      deltaKind: "none",
      hint: copy.systemActivity,
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

export const STOCK_PIE_KEYS = ["motors", "aggregates", "parts", "consumables"] as const;
export type StockPieKey = (typeof STOCK_PIE_KEYS)[number];

export type StockPieSlice = {
  segment: StockPieKey;
  count: number;
  fill: string;
};

const WAREHOUSE_PIE_GROUPS: InventoryGroupId[] = ["aggregates", "parts", "consumables"];

export function buildStockPieSeries(input: {
  warehouseItems: InventoryItem[];
  motorAvailable: number;
  motorLowStock: number;
  canWarehouse: boolean;
  canMotors: boolean;
}): { slices: StockPieSlice[]; lowStockCount: number; totalCount: number } {
  const { warehouseItems, motorAvailable, motorLowStock, canWarehouse, canMotors } = input;
  const active = warehouseItems.filter((item) => item.status === "active");
  const warehouseLow = active.filter(
    (item) => item.totalAvailable <= (item.lowStockThreshold ?? 1),
  ).length;
  const lowStockCount = warehouseLow + (canMotors ? motorLowStock : 0);

  const slices: StockPieSlice[] = [];

  if (canMotors && motorAvailable > 0) {
    slices.push({
      segment: "motors",
      count: motorAvailable,
      fill: "var(--color-motors)",
    });
  }

  if (canWarehouse) {
    const grouped: Record<InventoryGroupId, number> = {
      aggregates: 0,
      parts: 0,
      consumables: 0,
    };
    for (const item of active) {
      const group: InventoryGroupId =
        item.inventoryGroup && WAREHOUSE_PIE_GROUPS.includes(item.inventoryGroup)
          ? item.inventoryGroup
          : "consumables";
      grouped[group] += Math.max(0, item.totalAvailable);
    }
    for (const group of WAREHOUSE_PIE_GROUPS) {
      if (grouped[group] > 0) {
        slices.push({
          segment: group,
          count: grouped[group],
          fill: `var(--color-${group})`,
        });
      }
    }
  }

  return {
    slices,
    lowStockCount,
    totalCount: slices.reduce((sum, slice) => sum + slice.count, 0),
  };
}

export function formatMoneyKztFallback(value: number): string {
  return `$${value.toLocaleString(numberLocale())}`;
}

export type DailyWorkOrderRow = {
  day: string;
  label: string;
  count: number;
};

export function buildWorkOrdersDailySeries(workOrders: WorkOrder[], days = 7): DailyWorkOrderRow[] {
  const today = startOfDay(new Date());
  const locale = dateFnsLocale();
  return Array.from({ length: days }, (_, index) => {
    const day = subDays(today, days - 1 - index);
    const key = day.toDateString();
    const count = workOrders.filter((order) => order.createdAt.toDateString() === key).length;

    return {
      day: format(day, "EEE", { locale }),
      label: format(day, "d MMM", { locale }),
      count,
    };
  });
}
