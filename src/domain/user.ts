export const USER_ROLES = [
  "owner",
  "admin",
  "manager",
  "accountant",
  "employee",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export const PERMISSIONS = [
  "inventory_view",
  "inventory_edit",
  "inventory_delete",
  "accounting_view",
  "accounting_edit",
  "accounting_delete",
  "employee_manage",
  "employee_view",
  "analytics_view",
  "settings_manage",
  "export_data",
  "import_data",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [...PERMISSIONS],
  admin: [...PERMISSIONS],
  manager: [
    "inventory_view",
    "inventory_edit",
    "accounting_view",
    "employee_view",
    "analytics_view",
    "export_data",
    "import_data",
  ],
  accountant: [
    "inventory_view",
    "accounting_view",
    "accounting_edit",
    "analytics_view",
    "export_data",
    "import_data",
  ],
  employee: ["inventory_view", "accounting_view"],
};

export type UserEntity = {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  companyId: string | null;
  permissions?: Permission[];
  isActive?: boolean;
};

export function permissionSetForRole(role: UserRole): Set<Permission> {
  return new Set(ROLE_PERMISSIONS[role]);
}

export function effectivePermissions(user: UserEntity | null | undefined): Set<Permission> {
  if (!user) return new Set();
  const base = permissionSetForRole(user.role);
  for (const permission of user.permissions ?? []) {
    base.add(permission);
  }
  return base;
}

export function hasPermission(
  user: UserEntity | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false;
  if (user.isActive === false) return false;
  return effectivePermissions(user).has(permission);
}
