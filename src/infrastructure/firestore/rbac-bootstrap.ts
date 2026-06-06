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

async function trySetDoc(
  label: string,
  ref: ReturnType<typeof doc>,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    console.warn(`RBAC bootstrap skipped ${label}:`, error);
  }
}

export async function ensureRbacBootstrap(uid: string): Promise<void> {
  const db = getFirestoreDb();
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const userData = userSnap.data() as BootstrapUserDoc;
  const companyId = userData.companyId?.trim();
  if (!companyId) return;

  let ownerId: string | undefined;
  try {
    const companySnap = await getDoc(doc(db, "companies", companyId));
    ownerId = companySnap.exists()
      ? (companySnap.data() as { ownerId?: string }).ownerId
      : undefined;
  } catch (error) {
    console.warn("RBAC bootstrap skipped company lookup:", error);
  }

  const isCompanyOwner = ownerId === uid;
  const role = isCompanyOwner ? "owner" : (userData.role ?? "employee");
  const permissions =
    Array.isArray(userData.permissions) && userData.permissions.length > 0
      ? userData.permissions
      : ROLE_PERMISSIONS[role];
  const employeeRef = doc(db, "companies", companyId, "employees", uid);

  let employeeExists = false;
  try {
    const employeeSnap = await getDoc(employeeRef);
    employeeExists = employeeSnap.exists();
  } catch (error) {
    console.warn("RBAC bootstrap skipped employee lookup:", error);
  }

  if (!employeeExists) {
    await trySetDoc("employee create", employeeRef, {
      uid,
      companyId,
      email: String(userData.email ?? ""),
      fullName: String(userData.name ?? ""),
      role,
      permissions,
      invitedBy: uid,
      isActive: userData.isActive !== false,
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    });
  } else if (isCompanyOwner) {
    await trySetDoc("employee owner sync", employeeRef, {
      uid,
      companyId,
      role: "owner",
      permissions: ROLE_PERMISSIONS.owner,
      isActive: true,
      lastActiveAt: serverTimestamp(),
    });
  }

  await Promise.all(
    (Object.keys(ROLE_PERMISSIONS) as UserRole[]).map(async (roleId) => {
      const roleRef = doc(db, "companies", companyId, "roles", roleId);
      try {
        const roleSnap = await getDoc(roleRef);
        if (roleSnap.exists()) return;
      } catch (error) {
        console.warn(`RBAC bootstrap skipped role lookup (${roleId}):`, error);
        return;
      }

      await trySetDoc(`role ${roleId}`, roleRef, {
        companyId,
        role: roleId,
        permissions: ROLE_PERMISSIONS[roleId],
        isSystem: true,
        updatedAt: serverTimestamp(),
      });
    }),
  );
}
