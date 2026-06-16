import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { UserRole } from "@/domain/user";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";

export type UserCompanyMembership = {
  companyId: string;
  role: UserRole;
  name: string;
};

export async function recordUserCompanyMembership(
  userId: string,
  companyId: string,
  role: UserRole,
): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  if (!userId || !normalizedCompanyId) return;

  const db = getFirestoreDb();
  const membershipRef = doc(db, "users", userId, "memberships", normalizedCompanyId);
  const existing = await getDoc(membershipRef);
  await setDoc(
    membershipRef,
    {
      companyId: normalizedCompanyId,
      role,
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
}

export async function listUserCompanyMembershipIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  const db = getFirestoreDb();
  const snapshot = await getDocs(collection(db, "users", userId, "memberships"));
  return snapshot.docs.map((entry) => normalizeCompanyId(entry.id));
}

export function subscribeUserCompanyMemberships(
  userId: string,
  onChange: (memberships: UserCompanyMembership[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!userId) {
    onChange([]);
    return () => undefined;
  }

  const db = getFirestoreDb();
  return onSnapshot(
    collection(db, "users", userId, "memberships"),
    async (snapshot) => {
      const entries = await Promise.all(
        snapshot.docs.map(async (membershipDoc) => {
          const companyId = normalizeCompanyId(membershipDoc.id);
          const data = membershipDoc.data();
          const role = (data.role as UserRole) ?? "employee";
          const companySnap = await getDoc(doc(db, "companies", companyId));
          const companyName = companySnap.exists()
            ? String(companySnap.data()?.name ?? companyId)
            : companyId;
          return { companyId, role, name: companyName };
        }),
      );
      entries.sort((a, b) => a.name.localeCompare(b.name, "ru"));
      onChange(entries);
    },
    (error) => onError?.(error),
  );
}

export async function switchActiveCompany(userId: string, companyId: string): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const membershipSnap = await getDoc(
    doc(getFirestoreDb(), "users", userId, "memberships", normalizedCompanyId),
  );
  if (!membershipSnap.exists()) {
    throw new Error("Нет доступа к этой компании");
  }

  await updateDoc(doc(getFirestoreDb(), "users", userId), {
    companyId: normalizedCompanyId,
  });
}
