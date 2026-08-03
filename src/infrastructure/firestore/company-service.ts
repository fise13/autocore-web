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
import { recordUserCompanyMembership } from "@/infrastructure/firestore/user-company-membership-service";
import { createInventoryCategoryRepository } from "@/infrastructure/firestore/inventory-category-repository";
import { createWarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { ensureDefaultWarehouseUseCase } from "@/application/use-cases/warehouse/ensure-default-warehouse";

const warehouseRepository = createWarehouseRepository();
const categoryRepository = createInventoryCategoryRepository();

function ensureCompanyConsumablesWorkspace(companyId: string, ownerId: string) {
  return ensureDefaultWarehouseUseCase(
    warehouseRepository,
    companyId,
    ownerId,
    categoryRepository,
  ).catch(() => undefined);
}

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
      rethrowStep("Could not configure company roles", error);
    }
  }
}

async function upsertOwnerEmployee(
  companyId: string,
  ownerId: string,
  profile: { email: string; fullName: string; photoURL?: string | null },
): Promise<void> {
  const db = getFirestoreDb();
  const employeeRef = doc(db, "companies", companyId, "employees", ownerId);
  const employeeSnap = await getDoc(employeeRef);
  const photoURL = profile.photoURL?.trim() || null;
  const payload = {
    uid: ownerId,
    companyId,
    email: profile.email,
    fullName: profile.fullName,
    ...(photoURL ? { photoURL } : {}),
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
    rethrowStep("Could not create owner profile", error);
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
    rethrowStep("Could not link account to company", error);
  }
}

async function readOwnerProfile(
  ownerId: string,
): Promise<{ email: string; fullName: string; photoURL: string | null }> {
  const db = getFirestoreDb();
  const userSnap = await getDoc(doc(db, "users", ownerId));
  const userData = userSnap.data() ?? {};
  const photoURL =
    typeof userData.photoURL === "string" && userData.photoURL.trim()
      ? userData.photoURL.trim()
      : null;
  return {
    email: String(userData.email ?? ""),
    fullName: String(userData.name ?? ""),
    photoURL,
  };
}

export async function createCompany(ownerId: string, name: string): Promise<string> {
  const db = getFirestoreDb();
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Enter a company name");
  }

  const userSnap = await getDoc(doc(db, "users", ownerId));
  const previousCompanyId = String(userSnap.data()?.companyId ?? "").trim();

  const companyRef = doc(collection(db, "companies"));
  try {
    await setDoc(companyRef, {
      name: trimmedName,
      ownerId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    rethrowStep("Could not create company", error);
  }

  // Match native order: roles → employee → user profile link.
  await seedCompanyRoles(companyRef.id);

  const profile = await readOwnerProfile(ownerId);
  await upsertOwnerEmployee(companyRef.id, ownerId, profile);
  // Once the user doc is linked, the account has a company — later steps must not
  // strand the UI on an error (reload would otherwise "magically" apply the company).
  await linkUserToCompany(ownerId, companyRef.id, "owner");

  await recordUserCompanyMembership(ownerId, companyRef.id, "owner", trimmedName).catch((error) => {
    console.warn("[createCompany] membership record skipped:", error);
  });

  if (previousCompanyId && previousCompanyId !== companyRef.id) {
    const [previousCompanySnap, previousEmployeeSnap] = await Promise.all([
      getDoc(doc(db, "companies", previousCompanyId)),
      getDoc(doc(db, "companies", previousCompanyId, "employees", ownerId)),
    ]);
    const previousRole: UserRole =
      String(previousCompanySnap.data()?.ownerId ?? "") === ownerId
        ? "owner"
        : ((previousEmployeeSnap.data()?.role as UserRole) ?? "employee");
    const previousName = String(previousCompanySnap.data()?.name ?? previousCompanyId);
    await recordUserCompanyMembership(ownerId, previousCompanyId, previousRole, previousName).catch(
      (error) => {
        console.warn("[createCompany] previous membership record skipped:", error);
      },
    );
  }

  await seedFreeCompanyBilling(companyRef.id);
  await ensureCompanyConsumablesWorkspace(companyRef.id, ownerId);

  return companyRef.id;
}

export async function ensureDefaultCompany(ownerId: string) {
  const db = getFirestoreDb();
  const companyRef = doc(db, "companies", DEFAULT_COMPANY_ID);
  const companyPayload = {
    // Locale-independent canonical name — never persist UI copy as the company title.
    name: "My workspace",
    ownerId,
    createdAt: serverTimestamp(),
  };

  let companyDocReady = false;
  try {
    await setDoc(companyRef, companyPayload);
    companyDocReady = true;
  } catch (error) {
    if (!(error instanceof FirebaseError) || error.code !== "permission-denied") {
      rethrowStep("Could not create workspace", error);
    }
  }

  try {
    await seedCompanyRoles(DEFAULT_COMPANY_ID);
    const profile = await readOwnerProfile(ownerId);
    await upsertOwnerEmployee(DEFAULT_COMPANY_ID, ownerId, profile);
    await linkUserToCompany(ownerId, DEFAULT_COMPANY_ID, "owner");
    await recordUserCompanyMembership(ownerId, DEFAULT_COMPANY_ID, "owner", "My workspace");
    await seedFreeCompanyBilling(DEFAULT_COMPANY_ID);
    await ensureCompanyConsumablesWorkspace(DEFAULT_COMPANY_ID, ownerId);
  } catch (error) {
    if (
      !companyDocReady
      && error instanceof FirebaseError
      && error.code === "permission-denied"
    ) {
      throw new Error(`${userCopy.company.defaultTaken} Or create a new team below.`);
    }
    rethrowStep("Could not connect workspace data", error);
  }
}
