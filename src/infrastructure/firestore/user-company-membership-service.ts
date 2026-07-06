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

function readMembershipName(
  data: Record<string, unknown>,
  companyId: string,
): string {
  const stored = typeof data.name === "string" ? data.name.trim() : "";
  return stored || companyId;
}

async function resolveCompanyName(companyId: string, storedName?: string): Promise<string> {
  if (storedName?.trim()) return storedName.trim();
  try {
    const companySnap = await getDoc(doc(getFirestoreDb(), "companies", companyId));
    if (companySnap.exists()) {
      return String(companySnap.data()?.name ?? companyId);
    }
  } catch {
    // Fall back to id when company doc is not readable yet.
  }
  return companyId;
}

export async function recordUserCompanyMembership(
  userId: string,
  companyId: string,
  role: UserRole,
  companyName?: string,
): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  if (!userId || !normalizedCompanyId) return;

  const db = getFirestoreDb();
  const membershipRef = doc(db, "users", userId, "memberships", normalizedCompanyId);
  const existing = await getDoc(membershipRef);
  const name = await resolveCompanyName(
    normalizedCompanyId,
    companyName ?? (existing.exists() ? readMembershipName(existing.data(), normalizedCompanyId) : undefined),
  );

  await setDoc(
    membershipRef,
    {
      companyId: normalizedCompanyId,
      role,
      name,
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

export async function loadUserCompanyMemberships(userId: string): Promise<UserCompanyMembership[]> {
  if (!userId) return [];

  const db = getFirestoreDb();
  const snapshot = await getDocs(collection(db, "users", userId, "memberships"));
  const memberships = await Promise.all(
    snapshot.docs.map(async (membershipDoc) => {
      const companyId = normalizeCompanyId(membershipDoc.id);
      const data = membershipDoc.data();
      const role = (data.role as UserRole) ?? "employee";
      const name = await resolveCompanyName(companyId, readMembershipName(data, companyId));
      return { companyId, role, name };
    }),
  );

  memberships.sort((left, right) => left.name.localeCompare(right.name, "ru"));
  return memberships;
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
  let hydrateGeneration = 0;

  return onSnapshot(
    collection(db, "users", userId, "memberships"),
    (snapshot) => {
      const generation = ++hydrateGeneration;

      const entries: UserCompanyMembership[] = snapshot.docs.map((membershipDoc) => {
        const companyId = normalizeCompanyId(membershipDoc.id);
        const data = membershipDoc.data();
        const role = (data.role as UserRole) ?? "employee";
        return {
          companyId,
          role,
          name: readMembershipName(data, companyId),
        };
      });

      entries.sort((a, b) => a.name.localeCompare(b.name, "ru"));
      onChange(entries);

      const missingNames = entries.filter((entry) => entry.name === entry.companyId);
      if (missingNames.length === 0) return;

      void Promise.all(
        missingNames.map(async (entry) => {
          const name = await resolveCompanyName(entry.companyId);
          return { ...entry, name };
        }),
      )
        .then((hydrated) => {
          if (generation !== hydrateGeneration) return;
          const byId = new Map(hydrated.map((entry) => [entry.companyId, entry.name]));
          const next = entries.map((entry) => ({
            ...entry,
            name: byId.get(entry.companyId) ?? entry.name,
          }));
          next.sort((a, b) => a.name.localeCompare(b.name, "ru"));
          onChange(next);
        })
        .catch(() => undefined);
    },
    (error) => onError?.(error),
  );
}

export async function switchActiveCompany(userId: string, companyId: string): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const db = getFirestoreDb();
  const membershipSnap = await getDoc(
    doc(db, "users", userId, "memberships", normalizedCompanyId),
  );
  if (!membershipSnap.exists()) {
    throw new Error("Нет доступа к этой компании");
  }

  const membership = membershipSnap.data();
  const role = (membership?.role as UserRole) ?? "employee";
  const employeeSnap = await getDoc(
    doc(db, "companies", normalizedCompanyId, "employees", userId),
  );
  const employeeData = employeeSnap.exists() ? employeeSnap.data() : null;
  const permissions = Array.isArray(employeeData?.permissions) ? employeeData.permissions : [];

  await updateDoc(doc(db, "users", userId), {
    companyId: normalizedCompanyId,
    role,
    permissions,
    isActive: employeeData?.isActive !== false,
  });
}
