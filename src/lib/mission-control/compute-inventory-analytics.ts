import { differenceInCalendarDays } from "date-fns";

import { FinancialOperation } from "@/domain/financial-operation";
import { MotorEntity } from "@/domain/motor";
import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";

const STALE_DAYS = 90;

export type InventoryAnalytics = {
  avgDaysToSale: number | null;
  staleMotorCount: number;
  availableCount: number;
  soldCount: number;
  staleShare: number;
  topBrands: { name: string; count: number }[];
  topEngines: { code: string; count: number }[];
  motorSaleRevenue: number;
  motorSaleCount: number;
  motorSaleAvgAmount: number;
};

function topCounts<T>(
  items: T[],
  pick: (item: T) => string,
  limit = 5,
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = pick(item).trim();
    if (!key || key === "—" || key === "Не указан") continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function computeInventoryAnalytics(input: {
  motors: MotorEntity[];
  operations: FinancialOperation[];
}): InventoryAnalytics {
  const { motors, operations } = input;
  const now = new Date();

  const available = motors.filter((motor) => !motor.deletedAt && !motor.soldDate);
  const sold = motors.filter((motor) => !motor.deletedAt && motor.soldDate);

  const saleDurations = sold
    .map((motor) => {
      const arrival = motor.arrivalDate;
      const soldDate = motor.soldDate;
      if (!arrival || !soldDate) return null;
      const days = differenceInCalendarDays(soldDate, arrival);
      return days >= 0 ? days : null;
    })
    .filter((value): value is number => value != null);

  const avgDaysToSale =
    saleDurations.length > 0
      ? Math.round(saleDurations.reduce((sum, value) => sum + value, 0) / saleDurations.length)
      : null;

  const staleMotorCount = available.filter((motor) => {
    if (!motor.arrivalDate) return false;
    return differenceInCalendarDays(now, motor.arrivalDate) >= STALE_DAYS;
  }).length;

  const motorSales = operations.filter(
    (operation) =>
      operation.category === MOTOR_SALE_CATEGORY ||
      (operation.type === "sale" && (operation.relatedMotorId || operation.relatedMotorID)),
  );

  const motorSaleRevenue = motorSales.reduce((sum, operation) => sum + operation.amount, 0);
  const motorSaleCount = motorSales.length;
  const motorSaleAvgAmount = motorSaleCount > 0 ? Math.round(motorSaleRevenue / motorSaleCount) : 0;

  const topBrands = topCounts(available, (motor) => motor.brandName ?? "");
  const topEngines = topCounts(available, (motor) => motor.engineCode ?? "").map((item) => ({
    code: item.name,
    count: item.count,
  }));

  const staleShare =
    available.length > 0 ? Math.round((staleMotorCount / available.length) * 100) : 0;

  return {
    avgDaysToSale,
    staleMotorCount,
    availableCount: available.length,
    soldCount: sold.length,
    staleShare,
    topBrands,
    topEngines,
    motorSaleRevenue,
    motorSaleCount,
    motorSaleAvgAmount,
  };
}
