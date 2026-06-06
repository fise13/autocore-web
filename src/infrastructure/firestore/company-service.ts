import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { ROLE_PERMISSIONS, UserRole } from "@/domain/user";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { DEFAULT_COMPANY_ID } from "@/lib/company-id";
import { userCopy } from "@/lib/user-copy";
import { seedFreeCompanyBilling } from "@/infrastructure/firestore/billing-repository";

function rethrowStep(step: string, error: unknown): never {
  if (error instanceof FirebaseError) {
    throw new Error(`${step} (${error.code})`);
  }
  if (error instanceof Error) {
    throw new Error(`${step}: ${error.message}`);
  }
  throw new Error(step);
}

async function seedCompanyRoles(companyId: string): Promise<void> {
  const db = getFirestoreDb();
  for (const role of Object.keys(ROLE_PERMISSIONS) as UserRole[]) {
    try {
      await setDoc(
        doc(db, "companies", companyId, "roles", role),
        {
          companyId,
          role,
          permissions: ROLE_PERMISSIONS[role],
          isSystem: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      rethrowStep("Не удалось настроить роли компании", error);
    }
  }
}

async function upsertOwnerEmployee(
  companyId: string,
  ownerId: string,
  profile: { email: string; fullName: string },
): Promise<void> {
  const db = getFirestoreDb();
  const employeeRef = doc(db, "companies", companyId, "employees", ownerId);
  const employeeSnap = await getDoc(employeeRef);
  const payload = {
    uid: ownerId,
    companyId,
    email: profile.email,
    fullName: profile.fullName,
    role: "owner" as const,
    permissions: [] as string[],
    invitedBy: ownerId,
    isActive: true,
    lastActiveAt: serverTimestamp(),
    ...(employeeSnap.exists() ? {} : { createdAt: serverTimestamp() }),
  };

  try {
    if (employeeSnap.exists()) {
      await updateDoc(employeeRef, payload);
    } else {
      await setDoc(employeeRef, payload);
    }
  } catch (error) {
    rethrowStep("Не удалось создать профиль владельца", error);
  }
}

async function linkUserToCompany(
  userId: string,
  companyId: string,
  role: UserRole = "owner",
): Promise<void> {
  const db = getFirestoreDb();
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  const existingCompanyId = String(userSnap.data()?.companyId ?? "").trim();
  if (existingCompanyId === companyId && userSnap.data()?.role === role) {
    return;
  }

  const payload = {
    companyId,
    role,
    permissions: [] as string[],
    isActive: true,
  };

  try {
    if (userSnap.exists()) {
      await updateDoc(userRef, payload);
    } else {
      await setDoc(userRef, payload, { merge: true });
    }
  } catch (error) {
    rethrowStep("Не удалось привязать аккаунт к компании", error);
  }
}

async function readOwnerProfile(ownerId: string): Promise<{ email: string; fullName: string }> {
  const db = getFirestoreDb();
  const userSnap = await getDoc(doc(db, "users", ownerId));
  const userData = userSnap.data() ?? {};
  return {
    email: String(userData.email ?? ""),
    fullName: String(userData.name ?? ""),
  };
}

export async function createCompany(ownerId: string, name: string): Promise<string> {
  const db = getFirestoreDb();
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Укажите название компании");
  }

  const companyRef = doc(collection(db, "companies"));
  try {
    await setDoc(companyRef, {
      name: trimmedName,
      ownerId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    rethrowStep("Не удалось создать компанию", error);
  }

  // Match native order: roles → employee → user profile link.
  await seedCompanyRoles(companyRef.id);

  const profile = await readOwnerProfile(ownerId);
  await upsertOwnerEmployee(companyRef.id, ownerId, profile);
  await linkUserToCompany(ownerId, companyRef.id, "owner");
  await seedFreeCompanyBilling(companyRef.id);

  return companyRef.id;
}

export async function ensureDefaultCompany(ownerId: string) {
  const db = getFirestoreDb();
  const companyRef = doc(db, "companies", DEFAULT_COMPANY_ID);
  const companyPayload = {
    name: userCopy.defaultCompanyName,
    ownerId,
    createdAt: serverTimestamp(),
  };

  let companyDocReady = false;
  try {
    await setDoc(companyRef, companyPayload);
    companyDocReady = true;
  } catch (error) {
    if (!(error instanceof FirebaseError) || error.code !== "permission-denied") {
      rethrowStep("Не удалось создать рабочее пространство", error);
    }
  }

  try {
    await seedCompanyRoles(DEFAULT_COMPANY_ID);
    const profile = await readOwnerProfile(ownerId);
    await upsertOwnerEmployee(DEFAULT_COMPANY_ID, ownerId, profile);
    await linkUserToCompany(ownerId, DEFAULT_COMPANY_ID, "owner");
    await seedFreeCompanyBilling(DEFAULT_COMPANY_ID);
  } catch (error) {
    if (
      !companyDocReady
      && error instanceof FirebaseError
      && error.code === "permission-denied"
    ) {
      throw new Error(`${userCopy.company.defaultTaken} Или создайте новую команду ниже.`);
    }
    rethrowStep("Не удалось подключить данные", error);
  }
}
