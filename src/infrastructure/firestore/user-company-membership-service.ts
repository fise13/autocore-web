import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";

import { UserRole } from "@/domain/user";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { localizeDemoCompanyName } from "@/lib/demo/demo-localize";

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
  return localizeDemoCompanyName(companyId, stored || companyId);
}

function rolePriority(role: UserRole): number {
  if (role === "owner") return 3;
  if (role === "admin") return 2;
  return 1;
}

function mergeCompanyMemberships(entries: UserCompanyMembership[]): UserCompanyMembership[] {
  const byId = new Map<string, UserCompanyMembership>();

  for (const entry of entries) {
    const companyId = normalizeCompanyId(entry.companyId);
    if (!companyId) continue;

    const existing = byId.get(companyId);
    if (!existing) {
      byId.set(companyId, { ...entry, companyId });
      continue;
    }

    const nextRole =
      rolePriority(entry.role) >= rolePriority(existing.role) ? entry.role : existing.role;
    const nextName =
      existing.name && existing.name !== existing.companyId
        ? existing.name
        : entry.name && entry.name !== entry.companyId
          ? entry.name
          : existing.name || entry.name;

    byId.set(companyId, {
      companyId,
      role: nextRole,
      name: nextName,
    });
  }

  const merged = Array.from(byId.values());
  merged.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
  return merged;
}

async function resolveCompanyName(companyId: string, storedName?: string): Promise<string> {
  if (storedName?.trim()) return localizeDemoCompanyName(companyId, storedName.trim());
  try {
    const companySnap = await getDoc(doc(getFirestoreDb(), "companies", companyId));
    if (companySnap.exists()) {
      return localizeDemoCompanyName(companyId, String(companySnap.data()?.name ?? companyId));
    }
  } catch {
    // Fall back to id when company doc is not readable yet.
  }
  return localizeDemoCompanyName(companyId, companyId);
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

function mapMembershipDocs(
  snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> },
): UserCompanyMembership[] {
  return snapshot.docs.map((membershipDoc) => {
    const companyId = normalizeCompanyId(membershipDoc.id);
    const data = membershipDoc.data();
    const role = (data.role as UserRole) ?? "employee";
    return {
      companyId,
      role,
      name: readMembershipName(data, companyId),
    };
  });
}

async function loadStoredMemberships(userId: string): Promise<UserCompanyMembership[]> {
  const db = getFirestoreDb();
  const snapshot = await getDocs(collection(db, "users", userId, "memberships"));
  return mapMembershipDocs(snapshot);
}

async function loadOwnedCompanyMemberships(userId: string): Promise<UserCompanyMembership[]> {
  const db = getFirestoreDb();
  const owned = await getDocs(
    query(collection(db, "companies"), where("ownerId", "==", userId), limit(25)),
  );

  return owned.docs.map((companyDoc) => ({
    companyId: normalizeCompanyId(companyDoc.id),
    role: "owner" as const,
    name: localizeDemoCompanyName(
      normalizeCompanyId(companyDoc.id),
      String(companyDoc.data()?.name ?? companyDoc.id),
    ),
  }));
}

async function loadEmployeeCompanyMemberships(userId: string): Promise<UserCompanyMembership[]> {
  const db = getFirestoreDb();
  try {
    const snapshot = await getDocs(
      query(collectionGroup(db, "employees"), where("uid", "==", userId), limit(25)),
    );

    return snapshot.docs
      .filter((employeeDoc) => employeeDoc.data()?.isActive !== false)
      .map((employeeDoc) => {
        const companyId = normalizeCompanyId(employeeDoc.ref.parent.parent?.id ?? "");
        const data = employeeDoc.data();
        return {
          companyId,
          role: (data.role as UserRole) ?? "employee",
          name: companyId,
        };
      })
      .filter((entry) => entry.companyId);
  } catch {
    return [];
  }
}

async function hydrateMembershipNames(entries: UserCompanyMembership[]): Promise<UserCompanyMembership[]> {
  return Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      name: await resolveCompanyName(entry.companyId, entry.name),
    })),
  );
}

async function repairMissingMemberships(
  userId: string,
  companies: UserCompanyMembership[],
  stored: UserCompanyMembership[],
): Promise<void> {
  const storedIds = new Set(stored.map((entry) => entry.companyId));
  const missing = companies.filter((entry) => !storedIds.has(entry.companyId));
  if (missing.length === 0) return;

  await Promise.all(
    missing.map((entry) =>
      recordUserCompanyMembership(userId, entry.companyId, entry.role, entry.name).catch(() => undefined),
    ),
  );
}

export async function listUserCompanyMembershipIds(userId: string): Promise<string[]> {
  const companies = await loadUserCompanyMemberships(userId);
  return companies.map((entry) => entry.companyId);
}

export async function loadUserCompanyMemberships(userId: string): Promise<UserCompanyMembership[]> {
  if (!userId) return [];

  const stored = await loadStoredMemberships(userId);
  const [owned, employees] = await Promise.all([
    loadOwnedCompanyMemberships(userId),
    loadEmployeeCompanyMemberships(userId),
  ]);
  const merged = mergeCompanyMemberships([...stored, ...owned, ...employees]);
  const hydrated = await hydrateMembershipNames(merged);
  void repairMissingMemberships(userId, hydrated, stored);
  return hydrated;
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
  let storedMemberships: UserCompanyMembership[] = [];
  let ownedMemberships: UserCompanyMembership[] = [];
  let employeeMemberships: UserCompanyMembership[] = [];

  const publish = () => {
    const generation = ++hydrateGeneration;
    const merged = mergeCompanyMemberships([
      ...storedMemberships,
      ...ownedMemberships,
      ...employeeMemberships,
    ]);

    onChange(merged);
    void repairMissingMemberships(userId, merged, storedMemberships);

    const missingNames = merged.filter((entry) => entry.name === entry.companyId);
    if (missingNames.length === 0) return;

    void hydrateMembershipNames(merged)
      .then((hydrated) => {
        if (generation !== hydrateGeneration) return;
        onChange(hydrated);
      })
      .catch(() => undefined);
  };

  const refreshEmployees = () => {
    void loadEmployeeCompanyMemberships(userId)
      .then((entries) => {
        employeeMemberships = entries;
        publish();
      })
      .catch(() => undefined);
  };

  const unsubMemberships = onSnapshot(
    collection(db, "users", userId, "memberships"),
    (snapshot) => {
      storedMemberships = mapMembershipDocs(snapshot);
      publish();
      refreshEmployees();
    },
    (error) => onError?.(error),
  );

  const unsubOwned = onSnapshot(
    query(collection(db, "companies"), where("ownerId", "==", userId), limit(25)),
    (snapshot) => {
      ownedMemberships = snapshot.docs.map((companyDoc) => ({
        companyId: normalizeCompanyId(companyDoc.id),
        role: "owner" as const,
        name: localizeDemoCompanyName(
      normalizeCompanyId(companyDoc.id),
      String(companyDoc.data()?.name ?? companyDoc.id),
    ),
      }));
      publish();
    },
    (error) => onError?.(error),
  );

  refreshEmployees();

  return () => {
    unsubMemberships();
    unsubOwned();
  };
}

async function resolveCompanyAccess(
  userId: string,
  companyId: string,
): Promise<{ role: UserRole; permissions: string[]; isActive: boolean }> {
  const db = getFirestoreDb();
  const normalizedCompanyId = normalizeCompanyId(companyId);

  const [membershipSnap, employeeSnap, companySnap] = await Promise.all([
    getDoc(doc(db, "users", userId, "memberships", normalizedCompanyId)),
    getDoc(doc(db, "companies", normalizedCompanyId, "employees", userId)),
    getDoc(doc(db, "companies", normalizedCompanyId)),
  ]);

  const employeeData = employeeSnap.exists() ? employeeSnap.data() : null;
  const isOwner = companySnap.exists() && String(companySnap.data()?.ownerId ?? "") === userId;

  if (employeeData?.isActive === false && !isOwner) {
    throw new Error("No access to this company");
  }

  let role: UserRole = "employee";
  if (membershipSnap.exists()) {
    role = (membershipSnap.data()?.role as UserRole) ?? "employee";
  } else if (employeeData?.role) {
    role = employeeData.role as UserRole;
  } else if (isOwner) {
    role = "owner";
  } else {
    throw new Error("No access to this company");
  }

  const permissions = Array.isArray(employeeData?.permissions) ? employeeData.permissions : [];

  return {
    role,
    permissions,
    isActive: employeeData?.isActive !== false,
  };
}

function asSwitchCompanyError(error: unknown): Error {
  const raw = error instanceof Error ? error.message : String(error);
  if (/missing or insufficient permissions|permission-denied/i.test(raw)) {
    return new Error("You do not have access to that workspace.");
  }
  return error instanceof Error ? error : new Error(raw);
}

/**
 * Switch the signed-in user's active workspace.
 *
 * Firestore only allows this write to change `companyId` — role and
 * permissions stay on the employee record and are merged into the session
 * on the next profile refresh.
 */
export async function switchActiveCompany(userId: string, companyId: string): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const db = getFirestoreDb();
  const access = await resolveCompanyAccess(userId, normalizedCompanyId);

  // Rules require users/{uid}/memberships/{companyId} before the companyId write.
  await recordUserCompanyMembership(userId, normalizedCompanyId, access.role);

  try {
    await updateDoc(doc(db, "users", userId), {
      companyId: normalizedCompanyId,
    });
  } catch (error) {
    throw asSwitchCompanyError(error);
  }
}
