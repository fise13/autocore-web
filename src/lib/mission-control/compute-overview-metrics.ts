import { calculateCashBalanceUseCase } from "@/application/use-cases/calculate-cash-balance";
import { ActivityLogEntry } from "@/domain/rbac";
import { CompanyEmployee } from "@/domain/rbac";
import { MotorEntity } from "@/domain/motor";
import { FinancialOperation } from "@/domain/financial-operation";
import { buildAdvanceSnapshot } from "@/lib/accounting/advances";
import { resolveActivityLabel } from "@/lib/mission-control/activity-labels";

const ONLINE_WINDOW_MS = 15 * 60 * 1000;

export type MissionControlOverviewMetrics = {
  todayRevenue: number;
  todayExpenses: number;
  totalBalance: number;
  pendingAdvances: number;
  activeInventoryCount: number;
  lowStockCount: number;
  activeEmployeesCount: number;
  onlineEmployeesCount: number;
  changesToday: number;
};

function isToday(date: Date | undefined): boolean {
  if (!date) return false;
  return date.toDateString() === new Date().toDateString();
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function computeOverviewMetrics(input: {
  operations: FinancialOperation[];
  motors: MotorEntity[];
  employees: CompanyEmployee[];
  activityLogs: ActivityLogEntry[];
}): MissionControlOverviewMetrics {
  const { operations, motors, employees, activityLogs } = input;
  const balance = calculateCashBalanceUseCase(operations);
  const advances = buildAdvanceSnapshot(operations);

  const todayRevenue = operations
    .filter((item) => isToday(item.createdAt) && (item.type === "sale" || item.type === "income"))
    .reduce((sum, item) => sum + item.amount, 0);

  const todayExpenses = operations
    .filter((item) => isToday(item.createdAt) && item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const availableMotors = motors.filter((motor) => !motor.deletedAt && !motor.soldDate);
  const lowStockCount = availableMotors.filter((motor) => (motor.quantity ?? 1) <= 1).length;

  const now = Date.now();
  const activeEmployees = employees.filter((employee) => employee.isActive);
  const onlineEmployeesCount = activeEmployees.filter((employee) => {
    const lastActive = employee.lastActiveAt?.getTime() ?? 0;
    return lastActive > 0 && now - lastActive <= ONLINE_WINDOW_MS;
  }).length;

  const todayStart = startOfToday();
  const changesToday = activityLogs.filter((entry) => {
    const ts = entry.timestamp?.getTime() ?? 0;
    return ts >= todayStart.getTime();
  }).length;

  return {
    todayRevenue,
    todayExpenses,
    totalBalance: balance.total,
    pendingAdvances: Math.max(0, advances.balance),
    activeInventoryCount: availableMotors.length,
    lowStockCount,
    activeEmployeesCount: activeEmployees.length,
    onlineEmployeesCount,
    changesToday,
  };
}

export function isEmployeeOnline(employee: CompanyEmployee): boolean {
  const lastActive = employee.lastActiveAt?.getTime() ?? 0;
  if (!lastActive) return false;
  return Date.now() - lastActive <= ONLINE_WINDOW_MS;
}

export function activityModuleFromEntry(entry: ActivityLogEntry): string {
  if (entry.module) return entry.module;
  return resolveActivityLabel(entry.action).module;
}
