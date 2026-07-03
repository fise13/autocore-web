import type { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { readCompanyDisplayName } from '@/lib/company-display-name';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import type { CompanyAppConfig } from '@/types/company-config';
import type { EmployeeProfileSlice, UserCompanyMembership } from '@/types/rbac';
import type { Permission, UserEntity, UserRole } from '@/types/user';

import { loadCompanyAppConfig } from './company-config';
import { getFirebaseDb } from './index';

const ROLE_RANK: Record<UserRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  accountant: 2,
  employee: 1,
  mechanic: 1,
  diagnostician: 1,
};

type UserDocShape = {
  email?: string | null;
  name?: string | null;
  displayName?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  role?: UserRole;
  companyId?: string | null;
  isActive?: boolean;
};

type CompanyDocShape = {
  ownerId?: string | null;
  name?: string | null;
  legalName?: string | null;
  shortName?: string | null;
};

function resolveMemberRole(userRole: UserRole, employeeRole?: UserRole): UserRole {
  const employee = employeeRole ?? userRole;
  return ROLE_RANK[userRole] > ROLE_RANK[employee] ? userRole : employee;
}

export function mergeProfileWithEmployee(
  profile: UserEntity,
  employee: EmployeeProfileSlice | null | undefined,
): UserEntity {
  const withoutUserDocPermissions: UserEntity = {
    ...profile,
    permissions: [],
  };

  if (!employee) return withoutUserDocPermissions;

  const employeeRole = employee.role ?? profile.role;
  const role = resolveMemberRole(profile.role, employeeRole);
  const permissions = Array.isArray(employee.permissions) ? employee.permissions : [];

  const employeeName = employee.fullName?.trim();
  const userName = profile.displayName?.trim();
  const resolvedName =
    (employeeName && employeeName.split(/\s+/).filter(Boolean).length >= 2 ? employeeName : null) ??
    (userName && userName.split(/\s+/).filter(Boolean).length >= 2 ? userName : null) ??
    employeeName ??
    userName ??
    null;

  return {
    ...withoutUserDocPermissions,
    role,
    permissions,
    isActive: employee.isActive ?? profile.isActive,
    displayName: resolvedName,
  };
}

function readUserName(source: UserDocShape | undefined, authUser: User): string | null {
  const fromDoc = source?.name?.trim() || source?.displayName?.trim();
  if (fromDoc) return fromDoc;
  return authUser.displayName?.trim() || null;
}

function mapUserDoc(uid: string, authUser: User, source: UserDocShape | undefined): UserEntity {
  return {
    id: uid,
    email: source?.email ?? authUser.email ?? '',
    displayName: readUserName(source, authUser),
    phone: source?.phone ?? authUser.phoneNumber ?? null,
    photoURL: source?.photoURL ?? authUser.photoURL ?? null,
    role: source?.role ?? 'employee',
    companyId: source?.companyId ?? null,
    permissions: [],
    isActive: source?.isActive ?? true,
    isCompanyOwner: false,
  };
}

async function ensureUserDocument(user: User): Promise<void> {
  const ref = doc(getFirebaseDb(), 'users', user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;

  const displayName = user.displayName?.trim() || null;

  await setDoc(
    ref,
    {
      email: user.email ?? '',
      name: displayName,
      displayName,
      phone: user.phoneNumber ?? null,
      photoURL: user.photoURL ?? null,
      role: 'employee',
      companyId: null,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function buildFallbackProfile(authUser: User): UserEntity {
  return mapUserDoc(authUser.uid, authUser, undefined);
}

/** Fast path: user doc only — matches web auth bootstrap before full profile refresh. */
export async function loadFastUserProfile(authUser: User): Promise<UserEntity> {
  try {
    await ensureUserDocument(authUser);
    const snapshot = await getDoc(doc(getFirebaseDb(), 'users', authUser.uid));
    return mapUserDoc(authUser.uid, authUser, snapshot.data() as UserDocShape | undefined);
  } catch {
    return buildFallbackProfile(authUser);
  }
}

async function loadMemberships(uid: string): Promise<UserCompanyMembership[]> {
  const snapshot = await getDocs(collection(getFirebaseDb(), 'users', uid, 'memberships'));
  const memberships = await Promise.all(
    snapshot.docs.map(async (entry) => {
      const companyId = normalizeCompanyId(entry.id);
      const data = entry.data() as { role?: UserRole };
      const companySnapshot = await getDoc(doc(getFirebaseDb(), 'companies', companyId));
      const companyName = resolveActiveCompanyName(
        companyId,
        companySnapshot.exists() ? readCompanyDisplayName(companySnapshot.data(), companyId) : null,
        [],
      );
      return {
        companyId,
        role: data.role ?? 'employee',
        name: companyName,
      };
    }),
  );

  memberships.sort((left, right) => left.name.localeCompare(right.name, 'ru'));
  return memberships;
}

export async function hydrateEffectiveProfile(authUser: User): Promise<{
  profile: UserEntity;
  companyConfig: CompanyAppConfig | null;
  memberships: UserCompanyMembership[];
  activeCompanyName: string | null;
}> {
  await ensureUserDocument(authUser);

  const db = getFirebaseDb();
  const userRef = doc(db, 'users', authUser.uid);
  const userSnapshot = await getDoc(userRef);
  const userDoc = userSnapshot.data() as UserDocShape | undefined;
  const baseProfile = mapUserDoc(authUser.uid, authUser, userDoc);
  const memberships = await loadMemberships(authUser.uid);

  if (!baseProfile.companyId) {
    return {
      profile: baseProfile,
      companyConfig: null,
      memberships,
      activeCompanyName: null,
    };
  }

  const companyId = normalizeCompanyId(baseProfile.companyId);
  const companyRef = doc(db, 'companies', companyId);
  const employeeRef = doc(db, 'companies', companyId, 'employees', authUser.uid);

  const [companySnapshot, employeeSnapshot, companyConfig] = await Promise.all([
    getDoc(companyRef),
    getDoc(employeeRef),
    loadCompanyAppConfig(companyId),
  ]);

  const companyDoc = (companySnapshot.data() as CompanyDocShape | undefined) ?? undefined;
  const employeeDoc = employeeSnapshot.exists()
    ? (employeeSnapshot.data() as {
        role?: UserRole;
        permissions?: Permission[];
        isActive?: boolean;
        fullName?: string;
      })
    : null;

  const merged = mergeProfileWithEmployee(baseProfile, employeeDoc);
  const activeCompanyName = companySnapshot.exists()
    ? readCompanyDisplayName(companyDoc, companyId)
    : memberships.find((entry) => normalizeCompanyId(entry.companyId) === companyId)?.name ?? null;

  return {
    profile: {
      ...merged,
      companyId,
      isCompanyOwner: companyDoc?.ownerId === authUser.uid,
    },
    companyConfig,
    memberships,
    activeCompanyName,
  };
}

export async function updateUserProfileName(uid: string, name: string): Promise<void> {
  const trimmed = name.trim();
  await setDoc(
    doc(getFirebaseDb(), 'users', uid),
    {
      name: trimmed,
      displayName: trimmed,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Client-side profile save — same fields as web, no Next.js API required. */
export async function updateUserAccountProfile(
  authUser: User,
  payload: { name?: string | null; phone?: string | null },
): Promise<void> {
  const name = payload.name?.trim() ?? '';
  const phone = payload.phone?.trim() ?? '';

  await setDoc(
    doc(getFirebaseDb(), 'users', authUser.uid),
    {
      ...(payload.name !== undefined ? { name, displayName: name } : {}),
      ...(payload.phone !== undefined ? { phone: phone || null } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  if (payload.name && name) {
    await updateProfile(authUser, { displayName: name });

    const userSnapshot = await getDoc(doc(getFirebaseDb(), 'users', authUser.uid));
    const companyId = String((userSnapshot.data() as UserDocShape | undefined)?.companyId ?? '').trim();
    if (companyId) {
      await setDoc(
        doc(getFirebaseDb(), 'companies', normalizeCompanyId(companyId), 'employees', authUser.uid),
        { fullName: name, updatedAt: serverTimestamp() },
        { merge: true },
      );
    }
  }
}
