import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { ROLE_PERMISSIONS, UserRole } from "@/domain/user";
import { getFirestoreDb } from "@/infrastructure/firebase/client";

type BootstrapUserDoc = {
  email?: string;
  name?: string;
  role?: UserRole;
  companyId?: string;
  permissions?: string[];
  isActive?: boolean;
};

export async function ensureRbacBootstrap(uid: string): Promise<void> {
  try {
    const db = getFirestoreDb();
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data() as BootstrapUserDoc;
    const companyId = userData.companyId?.trim();
    if (!companyId) return;

    const role = userData.role ?? "employee";
    const employeeRef = doc(db, "companies", companyId, "employees", uid);
    const employeeSnap = await getDoc(employeeRef);

    if (!employeeSnap.exists()) {
      await setDoc(
        employeeRef,
        {
          uid,
          companyId,
          email: String(userData.email ?? ""),
          fullName: String(userData.name ?? ""),
          role,
          permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
          invitedBy: uid,
          isActive: userData.isActive !== false,
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    for (const roleId of Object.keys(ROLE_PERMISSIONS) as UserRole[]) {
      const roleRef = doc(db, "companies", companyId, "roles", roleId);
      const roleSnap = await getDoc(roleRef);
      if (roleSnap.exists()) continue;
      await setDoc(
        roleRef,
        {
          companyId,
          role: roleId,
          permissions: ROLE_PERMISSIONS[roleId],
          isSystem: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  } catch {
    // Bootstrap is best-effort; onboarding must not fail because of RBAC seeding.
  }
}
