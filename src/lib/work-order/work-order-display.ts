import { WorkOrder } from "@/domain/work-order";
import { CompanyEmployee } from "@/domain/rbac";
import { PayrollTransaction } from "@/domain/payroll-transaction";
import { UserRole } from "@/domain/user";

export const EMPLOYEE_ROLE_LABELS: Record<UserRole, string> = {
  owner: "Владелец",
  admin: "Администратор",
  manager: "Менеджер",
  accountant: "Бухгалтер",
  mechanic: "Механик",
  diagnostician: "Диагност",
  employee: "Сотрудник",
};

export function buildWorkOrderDisplayIndex(orders: WorkOrder[]): Map<string, number> {
  const sorted = [...orders].sort((left, right) => {
    const byCreated = left.createdAt.getTime() - right.createdAt.getTime();
    if (byCreated !== 0) return byCreated;
    return left.id.localeCompare(right.id);
  });

  const index = new Map<string, number>();
  sorted.forEach((order, position) => {
    index.set(order.id, position + 1);
  });
  return index;
}

export function workOrderDisplayNumber(
  order: Pick<WorkOrder, "number" | "id">,
  displayIndex?: Map<string, number> | number,
): number {
  if (displayIndex instanceof Map) {
    const fromIndex = displayIndex.get(order.id);
    if (fromIndex != null) return fromIndex;
  } else if (typeof displayIndex === "number" && displayIndex > 0) {
    return displayIndex;
  }

  const trimmed = order.number.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return 0;
}

export function formatWorkOrderActivityName(
  order: Pick<WorkOrder, "number" | "id">,
  displayIndex?: Map<string, number> | number,
): string {
  return formatWorkOrderLabel(order, displayIndex);
}

export function formatWorkOrderLabel(
  order: Pick<WorkOrder, "number" | "id">,
  displayIndex?: Map<string, number> | number,
): string {
  const number = workOrderDisplayNumber(order, displayIndex);
  if (number > 0) {
    return `Заказ-наряд №${number}`;
  }

  const trimmed = order.number.trim();
  if (/^заказ-наряд/i.test(trimmed)) {
    return trimmed;
  }

  return "Заказ-наряд";
}

export function laborLineAssigneeLabels(
  line: WorkOrder["laborLines"][number],
  employees: CompanyEmployee[],
): string[] {
  const names: string[] = [];
  for (const assigneeId of line.assigneeIds) {
    const name = resolveEmployeeName(assigneeId, employees);
    if (name) names.push(name);
  }
  for (const displayName of line.assigneeDisplayNames ?? []) {
    const trimmed = displayName.trim();
    if (trimmed) names.push(trimmed);
  }
  return names;
}

export function workOrderAssigneeSummary(
  order: WorkOrder,
  employees: CompanyEmployee[],
  payrollForOrder: PayrollTransaction[] = [],
): string {
  const names = new Set<string>();

  for (const line of order.laborLines) {
    for (const label of laborLineAssigneeLabels(line, employees)) {
      names.add(label);
    }
  }

  if (names.size === 0) {
    for (const row of payrollForOrder) {
      const name = resolveEmployeeName(row.employeeId, employees);
      if (name) names.add(name);
    }
  }

  if (names.size === 0) return "";
  return Array.from(names).join(", ");
}

export function resolveEmployeeName(employeeId: string, employees: CompanyEmployee[]): string | undefined {
  const employee =
    employees.find((entry) => entry.uid === employeeId) ??
    employees.find((entry) => entry.id === employeeId);
  if (!employee) return undefined;
  return employee.fullName.trim() || employee.email;
}

export function employeeRoleLabel(employeeId: string, employees: CompanyEmployee[]): string | undefined {
  const employee =
    employees.find((entry) => entry.uid === employeeId) ??
    employees.find((entry) => entry.id === employeeId);
  if (!employee) return undefined;
  return EMPLOYEE_ROLE_LABELS[employee.role] ?? employee.role;
}
