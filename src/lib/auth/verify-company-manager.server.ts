import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { Permission, UserRole, hasPermission } from "@/domain/user";
import { AccountAccessError } from "@/lib/auth/verify-account-access";
import { readCompanyProActive } from "@/lib/billing/verify-pro-subscription.server";
import { resolveMobileWorkspaceCompanyId } from "@/lib/mobile/session-bootstrap.server";
import { normalizeCompanyId } from "@/lib/company-id";

type EmployeeDoc = {
  role?: UserRole;
  permissions?: Permission[];
  isActive?: boolean;
};

type UserDoc = {
  companyId?: string;
  role?: UserRole;
  permissions?: Permission[];
  isCompanyOwner?: boolean;
};

export type VerifiedCompanyManager = {
  uid: string;
  companyId: string;
};

async function readSubscriptionPro(companyId: string): Promise<boolean> {
  return readCompanyProActive(companyId);
}

export async function verifyCompanyOwner(uid: string, companyId: string): Promise<void> {
  const normalizedCompanyId = companyId.trim();
  if (!normalizedCompanyId) {
    throw new AccountAccessError("Company not linked", 403);
  }

  const companySnap = await getAdminFirestore().collection("companies").doc(normalizedCompanyId).get();
  if (!companySnap.exists) {
    throw new AccountAccessError("Company not found", 404);
  }

  if (String(companySnap.data()?.ownerId ?? "") !== uid) {
    throw new AccountAccessError("Only company owner can perform this action", 403);
  }
}

export async function verifyCompanyManager(
  uid: string,
  requiredPermission: Permission = "employee_manage",
): Promise<VerifiedCompanyManager> {
  const db = getAdminFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    throw new AccountAccessError("User profile not found", 403);
  }
  const userData = userSnap.data() as UserDoc;

  const companyId = await resolveMobileWorkspaceCompanyId(uid);
  if (!companyId) {
    throw new AccountAccessError("Company not linked", 403);
  }
  const normalizedCompanyId = normalizeCompanyId(companyId);

  const companySnap = await db.collection("companies").doc(normalizedCompanyId).get();
  const isOwner = companySnap.exists && companySnap.data()?.ownerId === uid;

  const employeeSnap = await db
    .collection("companies")
    .doc(normalizedCompanyId)
    .collection("employees")
    .doc(uid)
    .get();
  const employee = employeeSnap.exists ? (employeeSnap.data() as EmployeeDoc) : null;

  const effectiveUser = {
    id: uid,
    email: "",
    displayName: null,
    phone: null,
    photoURL: null,
    role: (employee?.role ?? userData.role ?? "employee") as UserRole,
    companyId: normalizedCompanyId,
    permissions: employee?.permissions ?? userData.permissions ?? [],
    isActive: employee?.isActive ?? true,
    isCompanyOwner: isOwner,
  };

  if (!hasPermission(effectiveUser, requiredPermission) && !isOwner) {
    throw new AccountAccessError("Insufficient permissions", 403);
  }

  const isPro = await readSubscriptionPro(normalizedCompanyId);
  if (!isPro) {
    throw new AccountAccessError("Pro subscription required", 402);
  }

  return { uid, companyId: normalizedCompanyId };
}

/**
 * Who may attach, restore or transfer a workspace subscription.
 *
 * Mirrors `isCompanyBillingManager` in `firestore.rules` exactly — the owner,
 * or an employee whose role is `owner`/`admin`. The previous rule here was
 * owner-only, which meant an admin who tapped Buy on the paywall was charged
 * by StoreKit and then refused by `/verify` with a 403 the app swallowed: the
 * money left, the entitlement never arrived.
 */
export async function verifyCompanyBillingManager(uid: string, companyId: string): Promise<void> {
  const normalizedCompanyId = companyId.trim();
  if (!normalizedCompanyId) {
    throw new AccountAccessError("Company not linked", 403);
  }

  const db = getAdminFirestore();
  const companySnap = await db.collection("companies").doc(normalizedCompanyId).get();
  if (!companySnap.exists) {
    throw new AccountAccessError("Company not found", 404);
  }

  if (String(companySnap.data()?.ownerId ?? "") === uid) return;

  const employeeSnap = await db
    .collection("companies")
    .doc(normalizedCompanyId)
    .collection("employees")
    .doc(uid)
    .get();

  if (employeeSnap.exists) {
    const employee = employeeSnap.data() as EmployeeDoc;
    const active = employee.isActive ?? true;
    if (active && (employee.role === "owner" || employee.role === "admin")) return;
  }

  throw new AccountAccessError("Only an owner or admin can manage the subscription", 403);
}

/**
 * Any active member of the company.
 *
 * Used by read-and-expire paths (`/api/billing/refresh`) that every signed-in
 * user hits on foreground. Requiring ownership there made the reconcile a
 * guaranteed 403 for most of the team, so stale entitlement was never noticed.
 */
export async function verifyCompanyMembership(uid: string, companyId: string): Promise<void> {
  const normalizedCompanyId = companyId.trim();
  if (!normalizedCompanyId) {
    throw new AccountAccessError("Company not linked", 403);
  }

  const db = getAdminFirestore();
  const companySnap = await db.collection("companies").doc(normalizedCompanyId).get();
  if (!companySnap.exists) {
    throw new AccountAccessError("Company not found", 404);
  }
  if (String(companySnap.data()?.ownerId ?? "") === uid) return;

  const employeeSnap = await db
    .collection("companies")
    .doc(normalizedCompanyId)
    .collection("employees")
    .doc(uid)
    .get();
  if (employeeSnap.exists && ((employeeSnap.data() as EmployeeDoc).isActive ?? true)) return;

  const userSnap = await db.collection("users").doc(uid).get();
  if (userSnap.exists && (userSnap.data() as UserDoc).companyId === normalizedCompanyId) return;

  throw new AccountAccessError("You do not have access to this workspace", 403);
}
