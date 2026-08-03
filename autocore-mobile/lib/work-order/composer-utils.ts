import type { CompanyEmployee } from '@/types/rbac';
import type { WorkOrderAssigneeRole, WorkOrderLaborLine } from '@/types/work-order';

import { laborLineTotal, normalizeLaborPricingMode } from './labor-pricing';

export const ROLE_LABELS: Record<WorkOrderAssigneeRole, string> = {
  mechanic: 'Mechanic',
  diagnostician: 'Diagnostician',
  manager: 'Manager',
};

const EMPLOYEE_ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  diagnostician: 'Diagnostician',
  mechanic: 'Mechanic',
  accountant: 'Accountant',
};

export function nextComposerLineId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function parseGroupedNumber(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveAssigneeRole(employee: CompanyEmployee): WorkOrderAssigneeRole {
  if (employee.role === 'diagnostician') return 'diagnostician';
  if (employee.role === 'manager' || employee.role === 'owner' || employee.role === 'admin') {
    return 'manager';
  }
  return 'mechanic';
}

export function assigneeRoleLabel(employee: CompanyEmployee): string {
  return EMPLOYEE_ROLE_LABELS[employee.role] ?? ROLE_LABELS[resolveAssigneeRole(employee)];
}

export function laborAssigneeLabel(line: WorkOrderLaborLine, employees: CompanyEmployee[]): string {
  if (line.assigneeIds.length > 0) {
    const names = line.assigneeIds
      .map((id) => employees.find((entry) => entry.uid === id || entry.id === id))
      .filter(Boolean)
      .map((entry) => entry!.fullName || entry!.email);
    if (names.length > 0) return names.join(', ');
  }
  if (line.assigneeDisplayNames?.length) return line.assigneeDisplayNames.join(', ');
  return 'unassigned';
}

export function laborLineLabel(line: WorkOrderLaborLine, employees: CompanyEmployee[]): string {
  const assignee = laborAssigneeLabel(line, employees);
  const total = laborLineTotal(line);
  const mode = normalizeLaborPricingMode(line.pricingMode);
  const pricePart =
    mode === 'fixed'
      ? formatMoney(total)
      : `${line.hours} hr × ${formatMoney(line.unitPrice)} = ${formatMoney(total)}`;
  return `${line.title} · ${pricePart} · ${assignee} (${ROLE_LABELS[line.assigneeRole]})`;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
