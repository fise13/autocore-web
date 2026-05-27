import { Permission, UserEntity, hasPermission } from "@/domain/user";

export function can(user: UserEntity | null | undefined, permission: Permission): boolean {
  return hasPermission(user, permission);
}

export function canEditInventory(user: UserEntity | null | undefined): boolean {
  return can(user, "inventory_edit");
}

export function canManageEmployees(user: UserEntity | null | undefined): boolean {
  return can(user, "employee_manage");
}

export function canViewEmployees(user: UserEntity | null | undefined): boolean {
  return can(user, "employee_view");
}

export function canManageSettings(user: UserEntity | null | undefined): boolean {
  return can(user, "settings_manage");
}

