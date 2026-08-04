import type { UserRole } from "@/domain/user";

/**
 * Company owners are immutable in the role picker: both the `owner` role and the
 * company `ownerId` field mark a member whose role must not be reassigned here
 * (ownership transfer is a separate flow).
 */
export function isImmutableCompanyOwner(params: {
  role: string | null | undefined;
  uid: string | null | undefined;
  companyOwnerId?: string | null;
}): boolean {
  if (params.role === "owner") return true;
  const uid = params.uid?.trim();
  const ownerId = params.companyOwnerId?.trim();
  return Boolean(uid && ownerId && uid === ownerId);
}

export function assertAssignableEmployeeRole(role: UserRole): void {
  if (role === "owner") {
    throw new Error("OWNER_ROLE_LOCKED");
  }
}
