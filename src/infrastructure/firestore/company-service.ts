import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { ROLE_PERMISSIONS, UserRole } from "@/domain/user";
import { getFirestoreDb } from "@/infrastructure/firebase/client";

const DEFAULT_COMPANY_ID = "default";

export async function ensureDefaultCompany(ownerId: string) {
  const db = getFirestoreDb();
  const companyRef = doc(db, "companies", DEFAULT_COMPANY_ID);
  const userRef = doc(db, "users", ownerId);
  const snapshot = await getDoc(companyRef);
  const isNewCompany = !snapshot.exists();
  const existingOwnerId = snapshot.exists()
    ? String(snapshot.data()?.ownerId ?? "")
    : "";

  if (isNewCompany) {
    await setDoc(companyRef, {
      name: "Моя бухгалтерия",
      ownerId,
      createdAt: serverTimestamp(),
    });
  } else if (existingOwnerId !== ownerId) {
    throw new Error(
      "Компания «Моя бухгалтерия» уже создана другим пользователем. Присоединитесь по коду приглашения.",
    );
  }

  for (const role of Object.keys(ROLE_PERMISSIONS) as UserRole[]) {
    await setDoc(
      doc(db, "companies", DEFAULT_COMPANY_ID, "roles", role),
      {
        companyId: DEFAULT_COMPANY_ID,
        role,
        permissions: ROLE_PERMISSIONS[role],
        isSystem: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  const ownerProfile = await getDoc(userRef);
  const ownerData = ownerProfile.data() ?? {};
  await setDoc(
    doc(db, "companies", DEFAULT_COMPANY_ID, "employees", ownerId),
    {
      uid: ownerId,
      companyId: DEFAULT_COMPANY_ID,
      email: String(ownerData.email ?? ""),
      fullName: String(ownerData.name ?? ""),
      role: "owner",
      permissions: [],
      invitedBy: ownerId,
      isActive: true,
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    userRef,
    {
      companyId: DEFAULT_COMPANY_ID,
      role: "owner" satisfies UserRole,
      permissions: [],
      isActive: true,
    },
    { merge: true },
  );
}
