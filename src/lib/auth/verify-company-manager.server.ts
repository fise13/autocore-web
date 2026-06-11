import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { Permission, UserRole, hasPermission } from "@/domain/user";
import { AccountAccessError } from "@/lib/auth/verify-account-access";

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
  const snap = await getAdminFirestore()
    .collection("companies")
    .doc(companyId)
    .collection("billing")
    .doc("subscription")
    .get();
  if (!snap.exists) return false;
  const data = snap.data() as { proActive?: boolean; plan?: string; status?: string };
  if (typeof data.proActive === "boolean") return data.proActive;
  return (
    data.plan === "pro" &&
    (data.status === "active" || data.status === "trialing" || data.status === "past_due")
  );
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
  const companyId = String(userData.companyId ?? "").trim();
  if (!companyId) {
    throw new AccountAccessError("Company not linked", 403);
  }

  const companySnap = await db.collection("companies").doc(companyId).get();
  const isOwner = companySnap.exists && companySnap.data()?.ownerId === uid;

  const employeeSnap = await db.collection("companies").doc(companyId).collection("employees").doc(uid).get();
  const employee = employeeSnap.exists ? (employeeSnap.data() as EmployeeDoc) : null;

  const effectiveUser = {
    id: uid,
    email: "",
    displayName: null,
    phone: null,
    photoURL: null,
    role: (employee?.role ?? userData.role ?? "employee") as UserRole,
    companyId,
    permissions: employee?.permissions ?? userData.permissions ?? [],
    isActive: employee?.isActive ?? true,
    isCompanyOwner: isOwner,
  };

  if (!hasPermission(effectiveUser, requiredPermission) && !isOwner) {
    throw new AccountAccessError("Insufficient permissions", 403);
  }

  const isPro = await readSubscriptionPro(companyId);
  if (!isPro) {
    throw new AccountAccessError("Pro subscription required", 402);
  }

  return { uid, companyId };
}
