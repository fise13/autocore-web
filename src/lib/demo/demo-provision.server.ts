import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ROLE_PERMISSIONS, type UserRole } from "@/domain/user";
import { DEMO_ACCOUNT_EMAIL } from "@/lib/demo/demo-config";
import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";

export const DEMO_COMPANY_ID = "demo-autocore";

function isUserNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "auth/user-not-found"
  );
}

function demoPassword(): string {
  const fromEnv = process.env.DEMO_ACCOUNT_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  return `AutoCore-Demo-${DEMO_COMPANY_ID}!2026`;
}

export async function ensureDemoAuthUser(): Promise<{ uid: string }> {
  const auth = getAdminAuth();

  try {
    const user = await auth.getUserByEmail(DEMO_ACCOUNT_EMAIL);
    return { uid: user.uid };
  } catch (error) {
    if (!isUserNotFound(error)) throw error;
  }

  const created = await auth.createUser({
    email: DEMO_ACCOUNT_EMAIL,
    password: demoPassword(),
    displayName: "Демо AutoCore",
    emailVerified: true,
  });

  return { uid: created.uid };
}

export async function ensureDemoWorkspace(uid: string): Promise<void> {
  const db = getAdminFirestore();
  const companyRef = db.collection("companies").doc(DEMO_COMPANY_ID);
  const companySnap = await companyRef.get();

  if (!companySnap.exists) {
    await companyRef.set({
      name: "Демо — AutoCore Разборка",
      ownerId: uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    const ownerId = String(companySnap.data()?.ownerId ?? "").trim();
    if (ownerId !== uid) {
      await companyRef.set({ ownerId: uid }, { merge: true });
    }
  }

  for (const role of Object.keys(ROLE_PERMISSIONS) as UserRole[]) {
    await companyRef
      .collection("roles")
      .doc(role)
      .set(
        {
          companyId: DEMO_COMPANY_ID,
          role,
          permissions: ROLE_PERMISSIONS[role],
          isSystem: true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }

  const ownerPermissions = ROLE_PERMISSIONS.owner;

  await companyRef.collection("employees").doc(uid).set(
    {
      uid,
      companyId: DEMO_COMPANY_ID,
      email: DEMO_ACCOUNT_EMAIL,
      fullName: "Демо AutoCore",
      role: "owner",
      permissions: ownerPermissions,
      invitedBy: uid,
      isActive: true,
      lastActiveAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("users").doc(uid).set(
    {
      name: "Демо AutoCore",
      email: DEMO_ACCOUNT_EMAIL,
      role: "owner",
      companyId: DEMO_COMPANY_ID,
      permissions: ownerPermissions,
      isActive: true,
      onboardingCompleted: true,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const billingRef = companyRef.collection("billing").doc("subscription");
  const billingSnap = await billingRef.get();
  if (!billingSnap.exists) {
    await billingRef.set({
      plan: "pro",
      status: "trialing",
      proActive: true,
      provider: "internal",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

export async function createDemoCustomToken(): Promise<string> {
  const { uid } = await ensureDemoAuthUser();
  await ensureDemoWorkspace(uid);
  return getAdminAuth().createCustomToken(uid);
}
