import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { ROLE_PERMISSIONS, type UserRole } from "@/domain/user";
import { defaultCompanyAppConfig } from "@/domain/company-config";
import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  AI_GUIDE_ACCOUNT_EMAIL,
  AI_GUIDE_COMPANY_ADDRESS,
  AI_GUIDE_COMPANY_EMAIL,
  AI_GUIDE_COMPANY_ID,
  AI_GUIDE_COMPANY_LEGAL_NAME,
  AI_GUIDE_COMPANY_NAME,
  AI_GUIDE_COMPANY_PHONE,
  AI_GUIDE_COMPANY_SHORT_NAME,
  AI_GUIDE_COMPANY_SLOGAN,
  AI_GUIDE_COMPANY_WEBSITE,
  AI_GUIDE_LOGO_PATH,
  AI_GUIDE_OWNER_NAME,
} from "@/lib/playground/ai-guide/config";
import { seedAiGuideWorkspaceData } from "@/lib/playground/ai-guide/seed.server";

function isUserNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "auth/user-not-found"
  );
}

function playgroundPassword(): string {
  const fromEnv = process.env.AI_GUIDE_ACCOUNT_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  return `AutoCore-Guide-${AI_GUIDE_COMPANY_ID}!2026`;
}

export async function ensureAiGuideAuthUser(): Promise<{ uid: string }> {
  const auth = getAdminAuth();

  try {
    const user = await auth.getUserByEmail(AI_GUIDE_ACCOUNT_EMAIL);
    if (user.displayName !== AI_GUIDE_OWNER_NAME) {
      await auth.updateUser(user.uid, { displayName: AI_GUIDE_OWNER_NAME });
    }
    return { uid: user.uid };
  } catch (error) {
    if (!isUserNotFound(error)) throw error;
  }

  const created = await auth.createUser({
    email: AI_GUIDE_ACCOUNT_EMAIL,
    password: playgroundPassword(),
    displayName: AI_GUIDE_OWNER_NAME,
    emailVerified: true,
  });

  return { uid: created.uid };
}

export async function ensureAiGuideWorkspace(uid: string): Promise<void> {
  const db = getAdminFirestore();
  const companyRef = db.collection("companies").doc(AI_GUIDE_COMPANY_ID);
  const companySnap = await companyRef.get();
  const ownerPermissions = ROLE_PERMISSIONS.owner;
  const trialEnd = new Date();
  trialEnd.setFullYear(trialEnd.getFullYear() + 10);
  const appConfig = {
    ...defaultCompanyAppConfig(),
    onboardingCompleted: true,
    modules: {
      ...defaultCompanyAppConfig().modules,
      warehouse: true,
    },
  };

  await companyRef.set(
    {
      name: AI_GUIDE_COMPANY_NAME,
      legalName: AI_GUIDE_COMPANY_LEGAL_NAME,
      shortName: AI_GUIDE_COMPANY_SHORT_NAME,
      slogan: AI_GUIDE_COMPANY_SLOGAN,
      phone: AI_GUIDE_COMPANY_PHONE,
      email: AI_GUIDE_COMPANY_EMAIL,
      address: AI_GUIDE_COMPANY_ADDRESS,
      website: AI_GUIDE_COMPANY_WEBSITE,
      logoUrl: AI_GUIDE_LOGO_PATH,
      documentTheme: "modern",
      primaryColor: "#11131a",
      secondaryColor: "#0a73f2",
      ownerId: uid,
      ...(companySnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );

  await Promise.all([
    ...(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((role) =>
      companyRef.collection("roles").doc(role).set(
        {
          companyId: AI_GUIDE_COMPANY_ID,
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
        companyId: AI_GUIDE_COMPANY_ID,
        email: AI_GUIDE_ACCOUNT_EMAIL,
        fullName: AI_GUIDE_OWNER_NAME,
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
        name: AI_GUIDE_OWNER_NAME,
        email: AI_GUIDE_ACCOUNT_EMAIL,
        role: "owner",
        companyId: AI_GUIDE_COMPANY_ID,
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

  await seedAiGuideWorkspaceData(uid);
}

export async function createAiGuideCustomToken(): Promise<string> {
  const { uid } = await ensureAiGuideAuthUser();
  await ensureAiGuideWorkspace(uid);
  return getAdminAuth().createCustomToken(uid);
}
