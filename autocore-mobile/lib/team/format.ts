import { PERMISSIONS, ROLE_PERMISSIONS, type Permission, type UserRole } from '@/types/user';
import type { CompanyEmployee } from '@/types/rbac';

export function formatRole(role: string | null | undefined): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Manager';
    case 'accountant':
      return 'Accountant';
    case 'mechanic':
      return 'Mechanic';
    case 'diagnostician':
      return 'Diagnostic Tech';
    case 'employee':
      return 'Employee';
    default:
      return role ?? '—';
  }
}

export function formatPermission(permission: Permission): string {
  switch (permission) {
    case 'inventory_view':
      return 'View inventory';
    case 'inventory_edit':
      return 'Edit inventory';
    case 'inventory_delete':
      return 'Delete inventory items';
    case 'inventory_export':
      return 'Export inventory';
    case 'inventory_import':
      return 'Import inventory';
    case 'warehouse_manage':
      return 'Manage warehouses';
    case 'work_orders_view':
      return 'View work orders';
    case 'work_orders_edit':
      return 'Edit work orders';
    case 'clients_manage':
      return 'Manage clients';
    case 'vehicles_manage':
      return 'Manage vehicles';
    case 'accounting_view':
      return 'View accounting';
    case 'accounting_edit':
      return 'Edit accounting';
    case 'accounting_delete':
      return 'Delete accounting entries';
    case 'employee_manage':
      return 'Manage employees';
    case 'employee_view':
      return 'View employees';
    case 'analytics_view':
      return 'Analytics';
    case 'settings_manage':
      return 'Settings';
    case 'export_data':
      return 'Export data';
    case 'import_data':
      return 'Import data';
    case 'payroll_view_own':
      return 'Own payroll';
    default:
      return permission;
  }
}

export function permissionsSummary(employee: CompanyEmployee): string {
  const extra = employee.permissions.length;
  if (extra === 0) return `By role (${ROLE_PERMISSIONS[employee.role]?.length ?? 0})`;
  return `+${extra} extra`;
}

export function formatLastActive(lastActiveAt?: Date): string {
  if (!lastActiveAt) return '—';
  const deltaMs = Date.now() - lastActiveAt.getTime();
  if (deltaMs < 5 * 60 * 1000) return 'Just now';
  if (deltaMs < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.round(deltaMs / 60_000));
    return `${minutes} min ago`;
  }
  if (deltaMs < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.round(deltaMs / 3_600_000));
    return `${hours} h ago`;
  }
  return lastActiveAt.toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function employeeDisplayName(
  employee: CompanyEmployee,
  self?: { id?: string; displayName?: string | null; email?: string },
): string {
  if (employee.fullName?.trim()) return employee.fullName.trim();
  if (employee.uid === self?.id && self.displayName?.trim()) return self.displayName.trim();
  if (employee.email?.includes('@')) return employee.email.split('@')[0] ?? employee.email;
  return 'Employee';
}

export function formatInviteExpiry(date: Date): string {
  return date.toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const INVITE_ROLES: UserRole[] = [
  'mechanic',
  'diagnostician',
  'manager',
  'accountant',
  'employee',
  'admin',
];

export const ASSIGNABLE_ROLES: UserRole[] = [
  'admin',
  'manager',
  'accountant',
  'mechanic',
  'diagnostician',
  'employee',
];

export const ALL_PERMISSIONS = [...PERMISSIONS] as Permission[];

export const INVITE_ROLE_HINTS: Partial<Record<UserRole, string>> = {
  mechanic: 'Orders, clients, vehicles',
  diagnostician: 'Orders and diagnostics',
  manager: 'Ops and reports',
  accountant: 'Finance',
  employee: 'Basic access',
  admin: 'Full access',
};
