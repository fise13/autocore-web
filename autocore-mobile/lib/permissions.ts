import { hasPermission, type Permission, type UserEntity } from '@/types/user';

export function can(user: UserEntity | null | undefined, permission: Permission): boolean {
  return hasPermission(user, permission);
}

export function canEditWorkOrders(user: UserEntity | null | undefined): boolean {
  return can(user, 'work_orders_edit');
}

export function canViewWorkOrders(user: UserEntity | null | undefined): boolean {
  return can(user, 'work_orders_view');
}

export function canEditInventory(user: UserEntity | null | undefined): boolean {
  return can(user, 'inventory_edit');
}

export function canViewInventory(user: UserEntity | null | undefined): boolean {
  return can(user, 'inventory_view');
}

export function canManageSettings(user: UserEntity | null | undefined): boolean {
  return can(user, 'settings_manage');
}

export function canManageEmployees(user: UserEntity | null | undefined): boolean {
  return can(user, 'employee_manage');
}

export function canViewEmployees(user: UserEntity | null | undefined): boolean {
  return can(user, 'employee_view');
}
