import { PERMISSIONS, ROLE_PERMISSIONS, type Permission, type UserRole } from '@/types/user';
import type { CompanyEmployee } from '@/types/rbac';

export function formatRole(role: string | null | undefined): string {
  switch (role) {
    case 'owner':
      return 'Владелец';
    case 'admin':
      return 'Администратор';
    case 'manager':
      return 'Менеджер';
    case 'accountant':
      return 'Бухгалтер';
    case 'mechanic':
      return 'Механик';
    case 'diagnostician':
      return 'Диагност';
    case 'employee':
      return 'Сотрудник';
    default:
      return role ?? '—';
  }
}

export function formatPermission(permission: Permission): string {
  switch (permission) {
    case 'inventory_view':
      return 'Просмотр склада';
    case 'inventory_edit':
      return 'Редактирование склада';
    case 'inventory_delete':
      return 'Удаление со склада';
    case 'inventory_export':
      return 'Экспорт склада';
    case 'inventory_import':
      return 'Импорт склада';
    case 'warehouse_manage':
      return 'Управление складами';
    case 'work_orders_view':
      return 'Просмотр заказ-нарядов';
    case 'work_orders_edit':
      return 'Редактирование заказ-нарядов';
    case 'clients_manage':
      return 'Управление клиентами';
    case 'vehicles_manage':
      return 'Управление автомобилями';
    case 'accounting_view':
      return 'Просмотр бухгалтерии';
    case 'accounting_edit':
      return 'Редактирование бухгалтерии';
    case 'accounting_delete':
      return 'Удаление в бухгалтерии';
    case 'employee_manage':
      return 'Управление сотрудниками';
    case 'employee_view':
      return 'Просмотр сотрудников';
    case 'analytics_view':
      return 'Аналитика';
    case 'settings_manage':
      return 'Настройки';
    case 'export_data':
      return 'Экспорт данных';
    case 'import_data':
      return 'Импорт данных';
    case 'payroll_view_own':
      return 'Своя зарплата';
    default:
      return permission;
  }
}

export function permissionsSummary(employee: CompanyEmployee): string {
  const extra = employee.permissions.length;
  if (extra === 0) return `По роли (${ROLE_PERMISSIONS[employee.role]?.length ?? 0})`;
  return `+${extra} доп.`;
}

export function employeeDisplayName(
  employee: CompanyEmployee,
  self?: { id?: string; displayName?: string | null; email?: string },
): string {
  if (employee.fullName?.trim()) return employee.fullName.trim();
  if (employee.uid === self?.id && self.displayName?.trim()) return self.displayName.trim();
  if (employee.email?.includes('@')) return employee.email.split('@')[0] ?? employee.email;
  return 'Сотрудник';
}

export function formatInviteExpiry(date: Date): string {
  return date.toLocaleString('ru-RU', {
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
  mechanic: 'Заказ-наряды, клиенты, авто',
  diagnostician: 'Заказ-наряды и диагностика',
  manager: 'Управление и отчёты',
  accountant: 'Бухгалтерия',
  employee: 'Базовый просмотр',
  admin: 'Полный доступ',
};
