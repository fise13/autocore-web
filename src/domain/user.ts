export const USER_ROLES = [
  "owner",
  "admin",
  "manager",
  "accountant",
  "mechanic",
  "diagnostician",
  "employee",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export const PERMISSIONS = [
  "inventory_view",
  "inventory_edit",
  "inventory_delete",
  "inventory_export",
  "inventory_import",
  "warehouse_manage",
  "work_orders_view",
  "work_orders_edit",
  "clients_manage",
  "vehicles_manage",
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
  admin: [
    "inventory_view",
    "inventory_edit",
    "inventory_delete",
    "inventory_export",
    "inventory_import",
    "warehouse_manage",
    "work_orders_view",
    "work_orders_edit",
    "clients_manage",
    "vehicles_manage",
    "employee_view",
    "analytics_view",
    "settings_manage",
    "export_data",
    "import_data",
  ],
  manager: [
    "inventory_view",
    "inventory_edit",
    "inventory_export",
    "inventory_import",
    "work_orders_view",
    "work_orders_edit",
    "clients_manage",
    "vehicles_manage",
    "accounting_view",
    "employee_view",
    "analytics_view",
    "export_data",
    "import_data",
  ],
  accountant: [
    "accounting_view",
    "accounting_edit",
    "accounting_delete",
    "analytics_view",
    "export_data",
    "import_data",
  ],
  mechanic: [
    "work_orders_view",
    "work_orders_edit",
    "clients_manage",
    "vehicles_manage",
  ],
  diagnostician: [
    "work_orders_view",
    "work_orders_edit",
    "vehicles_manage",
  ],
  employee: ["inventory_view", "accounting_view", "work_orders_view"],
};

export type UserEntity = {
  id: string;
  email: string;
  displayName: string | null;
  phone?: string | null;
  photoURL?: string | null;
  role: UserRole;
  companyId: string | null;
  permissions?: Permission[];
  isActive?: boolean;
  /** True when companies/{companyId}.ownerId === user id (Firestore isOwnerOfCompany). */
  isCompanyOwner?: boolean;
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
  if (user.isCompanyOwner) return true;
  if (user.isActive === false) return false;
  return effectivePermissions(user).has(permission);
}
