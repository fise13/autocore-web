import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { ROLE_PERMISSIONS, type UserRole } from "@/domain/user";
import { defaultCompanyAppConfig } from "@/domain/company-config";
import { DEMO_ACCOUNT_EMAIL, DEMO_COMPANY_ID } from "@/lib/demo/demo-config";
import { seedDemoWorkspaceData } from "@/lib/demo/demo-seed.server";
import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import { userCopyEn } from "@/lib/user-copy.en";

export { DEMO_COMPANY_ID };

const DEMO_OWNER_NAME = userCopyEn.demo.ownerName;
const DEMO_COMPANY_NAME = userCopyEn.demo.companyName;

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
    if (user.displayName !== DEMO_OWNER_NAME) {
      await auth.updateUser(user.uid, { displayName: DEMO_OWNER_NAME });
    }
    return { uid: user.uid };
  } catch (error) {
    if (!isUserNotFound(error)) throw error;
  }

  const created = await auth.createUser({
    email: DEMO_ACCOUNT_EMAIL,
    password: demoPassword(),
    displayName: DEMO_OWNER_NAME,
    emailVerified: true,
  });

  return { uid: created.uid };
}

export async function ensureDemoWorkspace(uid: string): Promise<void> {
  const db = getAdminFirestore();
  const companyRef = db.collection("companies").doc(DEMO_COMPANY_ID);
  const companySnap = await companyRef.get();

  await companyRef.set(
    {
      name: DEMO_COMPANY_NAME,
      ownerId: uid,
      ...(companySnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );

  const ownerPermissions = ROLE_PERMISSIONS.owner;
  const trialEnd = new Date();
  trialEnd.setFullYear(trialEnd.getFullYear() + 10);
  const appConfig = {
    ...defaultCompanyAppConfig(),
    onboardingCompleted: true,
  };

  await Promise.all([
    ...(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((role) =>
      companyRef.collection("roles").doc(role).set(
        {
          companyId: DEMO_COMPANY_ID,
          role,
          permissions: ROLE_PERMISSIONS[role],
          isSystem: true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    ),
    companyRef.collection("employees").doc(uid).set(
      {
        uid,
        companyId: DEMO_COMPANY_ID,
        email: DEMO_ACCOUNT_EMAIL,
        fullName: DEMO_OWNER_NAME,
        role: "owner",
        permissions: ownerPermissions,
        invitedBy: uid,
        isActive: true,
        lastActiveAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
    db.collection("users").doc(uid).set(
      {
        name: DEMO_OWNER_NAME,
        email: DEMO_ACCOUNT_EMAIL,
        role: "owner",
        companyId: DEMO_COMPANY_ID,
        permissions: ownerPermissions,
        isActive: true,
        onboardingCompleted: true,
        preferredLocale: "en",
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
    companyRef.collection("billing").doc("subscription").set(
      {
        plan: "pro",
        status: "trialing",
        proActive: true,
        provider: "internal",
        trialUsed: true,
        currentPeriodEnd: Timestamp.fromDate(trialEnd),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
    companyRef.collection("settings").doc("app").set(
      {
        onboardingCompleted: true,
        modules: appConfig.modules,
        specificCategories: appConfig.specificCategories.map(({ id, name, mode, warrantyDefault }) => {
          const item: Record<string, unknown> = { id, name, mode };
          if (warrantyDefault !== undefined) item.warrantyDefault = warrantyDefault;
          return item;
        }),
        defaultWarrantyTemplate: appConfig.defaultWarrantyTemplate,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
  ]);

  await seedDemoWorkspaceData(uid);
}

/**
 * Issues a Firebase custom token for the shared demo account.
 *
 * Must stay well under the Vercel function budget. A full workspace wipe on
 * every visit previously walked ~30 Firestore collections sequentially from
 * `fra1` and timed out (~15s → 503). Reset stays on logout (`/api/demo/reset`).
 */
export async function createDemoCustomToken(): Promise<string> {
  const { uid } = await ensureDemoAuthUser();
  await ensureDemoWorkspace(uid);
  return getAdminAuth().createCustomToken(uid);
}
