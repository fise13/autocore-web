import "server-only";

import {
  mergeProfileWithEmployee,
  type Permission,
  type UserEntity,
  type UserRole,
  resolveAccessScopes,
  type AccessScopes,
} from "@autocore/rbac";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminUser } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";

export type ResolvedAccessProfile = {
  profile: UserEntity;
  companyId: string;
  scopes: AccessScopes;
  hasEmployeeMembership: boolean;
};

export async function resolveAccessProfile(
  uid: string,
  companyId: string,
): Promise<ResolvedAccessProfile> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);

  const [userSnap, employeeSnap, companySnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("companies").doc(normalizedCompanyId).collection("employees").doc(uid).get(),
    db.collection("companies").doc(normalizedCompanyId).get(),
  ]);

  if (!userSnap.exists) {
    throw new Error("User profile not found");
  }

  const base = mapAdminUser(userSnap.id, userSnap.data() as Record<string, unknown>);
  const rawName = userSnap.data()?.name;
  if (!base.displayName && typeof rawName === "string" && rawName.trim()) {
    base.displayName = rawName.trim();
  }

  const employeeData = employeeSnap.exists ? employeeSnap.data() : null;
  const merged = mergeProfileWithEmployee(
    { ...base, companyId: normalizedCompanyId },
    employeeData
      ? {
          role: employeeData.role as UserRole | undefined,
          permissions: Array.isArray(employeeData.permissions)
            ? (employeeData.permissions as Permission[])
            : undefined,
          isActive: typeof employeeData.isActive === "boolean" ? employeeData.isActive : undefined,
          fullName: typeof employeeData.fullName === "string" ? employeeData.fullName : undefined,
        }
      : null,
  );

  const isCompanyOwner = companySnap.exists && companySnap.data()?.ownerId === uid;
  const hasEmployeeMembership = employeeSnap.exists;
  const profile: UserEntity = {
    ...merged,
    companyId: normalizedCompanyId,
    isActive: hasEmployeeMembership || isCompanyOwner ? merged.isActive : false,
    isCompanyOwner,
  };

  return {
    profile,
    companyId: normalizedCompanyId,
    scopes: resolveAccessScopes(profile),
    hasEmployeeMembership,
  };
}
