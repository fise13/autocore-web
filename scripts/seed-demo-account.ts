/**
 * Creates / refreshes the marketing demo account (Firebase Auth + Firestore workspace).
 *
 * Usage:
 *   npx tsx scripts/seed-demo-account.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { ROLE_PERMISSIONS, type UserRole } from "../src/domain/user";
import { DEMO_ACCOUNT_EMAIL } from "../src/lib/demo/demo-config";

const DEMO_COMPANY_ID = "demo-autocore";

config({ path: resolve(process.cwd(), ".env.local") });

function initAdmin() {
  if (getApps().length > 0) return;

  const path =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (!path) {
    throw new Error("Set FIREBASE_SERVICE_ACCOUNT_PATH in .env.local");
  }

  const serviceAccount = JSON.parse(readFileSync(resolve(path), "utf8")) as Record<string, unknown>;
  initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  });
}

function demoPassword(): string {
  return process.env.DEMO_ACCOUNT_PASSWORD?.trim() || `AutoCore-Demo-${DEMO_COMPANY_ID}!2026`;
}

async function ensureDemoAuthUser() {
  const auth = getAuth();
  try {
    const user = await auth.getUserByEmail(DEMO_ACCOUNT_EMAIL);
    return user.uid;
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
  }

  const created = await auth.createUser({
    email: DEMO_ACCOUNT_EMAIL,
    password: demoPassword(),
    displayName: "Демо AutoCore",
    emailVerified: true,
  });
  return created.uid;
}

async function ensureDemoWorkspace(uid: string) {
  const db = getFirestore();
  const companyRef = db.collection("companies").doc(DEMO_COMPANY_ID);
  const companySnap = await companyRef.get();

  if (!companySnap.exists) {
    await companyRef.set({
      name: "Демо — AutoCore Разборка",
      ownerId: uid,
      createdAt: FieldValue.serverTimestamp(),
    });
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

  await companyRef.collection("employees").doc(uid).set(
    {
      uid,
      companyId: DEMO_COMPANY_ID,
      email: DEMO_ACCOUNT_EMAIL,
      fullName: "Демо AutoCore",
      role: "owner",
      permissions: [],
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
      permissions: [],
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

async function main() {
  initAdmin();
  const uid = await ensureDemoAuthUser();
  await ensureDemoWorkspace(uid);
  const token = await getAuth().createCustomToken(uid);

  console.log("Demo account ready:");
  console.log(`  email:   ${DEMO_ACCOUNT_EMAIL}`);
  console.log(`  company: ${DEMO_COMPANY_ID}`);
  console.log(`  uid:     ${uid}`);
  console.log(`  token:   ${token.slice(0, 24)}…`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
