import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { readCompanyDisplayName } from '@/lib/company-display-name';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import type { UserCompanyMembership } from '@/types/rbac';
import type { UserRole } from '@/types/user';
import { getFirebaseDb } from '@/services/firebase';

function rolePriority(role: UserRole): number {
  if (role === 'owner') return 3;
  if (role === 'admin') return 2;
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
  merged.sort((left, right) => left.name.localeCompare(right.name, 'ru'));
  return merged;
}

async function resolveCompanyName(companyId: string, storedName?: string): Promise<string> {
  if (storedName?.trim() && storedName !== companyId) return storedName.trim();
  try {
    const companySnapshot = await getDoc(doc(getFirebaseDb(), 'companies', companyId));
    if (companySnapshot.exists()) {
      return resolveActiveCompanyName(
        companyId,
        readCompanyDisplayName(companySnapshot.data(), companyId),
        [],
      );
    }
  } catch {
    // Fall back to id when company doc is not readable yet.
  }
  return storedName?.trim() || companyId;
}

export async function recordUserCompanyMembership(
  userId: string,
  companyId: string,
  role: UserRole,
  companyName?: string,
): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  if (!userId || !normalizedCompanyId) return;

  const membershipRef = doc(getFirebaseDb(), 'users', userId, 'memberships', normalizedCompanyId);
  const existing = await getDoc(membershipRef);
  const name = await resolveCompanyName(
    normalizedCompanyId,
    companyName ?? (existing.exists() ? String(existing.data()?.name ?? '') : undefined),
  );

  await setDoc(
    membershipRef,
    {
      companyId: normalizedCompanyId,
      role,
      ...(name ? { name } : {}),
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
}

async function loadStoredMemberships(userId: string): Promise<UserCompanyMembership[]> {
  const snapshot = await getDocs(collection(getFirebaseDb(), 'users', userId, 'memberships'));
  return snapshot.docs.map((entry) => {
    const companyId = normalizeCompanyId(entry.id);
    const data = entry.data() as { role?: UserRole; name?: string };
    return {
      companyId,
      role: data.role ?? 'employee',
      name: data.name?.trim() || companyId,
    };
  });
}

async function loadOwnedCompanyMemberships(userId: string): Promise<UserCompanyMembership[]> {
  const owned = await getDocs(
    query(collection(getFirebaseDb(), 'companies'), where('ownerId', '==', userId), limit(25)),
  );

  return owned.docs.map((companyDoc) => ({
    companyId: normalizeCompanyId(companyDoc.id),
    role: 'owner' as const,
    name: String(companyDoc.data()?.name ?? companyDoc.id),
  }));
}

async function loadEmployeeCompanyMemberships(userId: string): Promise<UserCompanyMembership[]> {
  try {
    const snapshot = await getDocs(
      query(collectionGroup(getFirebaseDb(), 'employees'), where('uid', '==', userId), limit(25)),
    );

    return snapshot.docs
      .filter((employeeDoc) => employeeDoc.data()?.isActive !== false)
      .map((employeeDoc) => {
        const companyId = normalizeCompanyId(employeeDoc.ref.parent.parent?.id ?? '');
        const data = employeeDoc.data();
        return {
          companyId,
          role: (data.role as UserRole) ?? 'employee',
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

export async function listUserCompanyMemberships(userId: string): Promise<UserCompanyMembership[]> {
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

async function resolveCompanyAccess(
  userId: string,
  companyId: string,
): Promise<{ role: UserRole; permissions: string[]; isActive: boolean }> {
  const normalizedCompanyId = normalizeCompanyId(companyId);

  const [membershipSnap, employeeSnap, companySnap] = await Promise.all([
    getDoc(doc(getFirebaseDb(), 'users', userId, 'memberships', normalizedCompanyId)),
    getDoc(doc(getFirebaseDb(), 'companies', normalizedCompanyId, 'employees', userId)),
    getDoc(doc(getFirebaseDb(), 'companies', normalizedCompanyId)),
  ]);

  const employeeData = employeeSnap.exists() ? employeeSnap.data() : null;
  const isOwner = companySnap.exists() && String(companySnap.data()?.ownerId ?? '') === userId;

  if (employeeData?.isActive === false && !isOwner) {
    throw new Error('No access to this company');
  }

  let role: UserRole = 'employee';
  if (membershipSnap.exists()) {
    role = (membershipSnap.data() as { role?: UserRole }).role ?? 'employee';
  } else if (employeeData?.role) {
    role = employeeData.role as UserRole;
  } else if (isOwner) {
    role = 'owner';
  } else {
    throw new Error('No access to this company');
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
    return new Error('You do not have access to that workspace.');
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
  const access = await resolveCompanyAccess(userId, normalizedCompanyId);

  // Rules require users/{uid}/memberships/{companyId} before the companyId write.
  await recordUserCompanyMembership(userId, normalizedCompanyId, access.role);

  try {
    await updateDoc(doc(getFirebaseDb(), 'users', userId), {
      companyId: normalizedCompanyId,
    });
  } catch (error) {
    throw asSwitchCompanyError(error);
  }
}
