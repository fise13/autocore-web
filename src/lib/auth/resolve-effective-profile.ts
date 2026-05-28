import { Permission, UserEntity, UserRole } from "@/domain/user";

const ROLE_RANK: Record<UserRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  accountant: 2,
  employee: 1,
};

export type EmployeeProfileSlice = {
  role?: UserRole;
  permissions?: Permission[];
  isActive?: boolean;
  fullName?: string;
};

function resolveMemberRole(userRole: UserRole, employeeRole?: UserRole): UserRole {
  const employee = employeeRole ?? userRole;
  return ROLE_RANK[userRole] > ROLE_RANK[employee] ? userRole : employee;
}

/**
 * Align client RBAC with Firestore rules:
 * - memberRole = higher of users/{uid}.role and employees/{uid}.role
 * - custom permissions only from employees/{uid}.permissions (not users doc)
 */
export function mergeProfileWithEmployee(
  profile: UserEntity,
  employee: EmployeeProfileSlice | null | undefined,
): UserEntity {
  const withoutUserDocPermissions: UserEntity = {
    ...profile,
    permissions: [],
  };

  if (!employee) return withoutUserDocPermissions;

  const employeeRole = employee.role ?? profile.role;
  const role = resolveMemberRole(profile.role, employeeRole);
  const permissions = Array.isArray(employee.permissions) ? employee.permissions : [];

  return {
    ...withoutUserDocPermissions,
    role,
    permissions,
    isActive: employee.isActive ?? profile.isActive,
    displayName: employee.fullName?.trim() || profile.displayName,
  };
}
