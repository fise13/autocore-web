import type { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { DEFAULT_COMPANY_ID, normalizeCompanyId, isProductionCompanyId } from '@/lib/company-id';
import { readCompanyDisplayName } from '@/lib/company-display-name';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import type { WorkspaceAccessBlock } from '@/types/workspace-access';
import { resolveWorkspaceAccessBlock } from '@/lib/workspace-access';
import type { CompanyAppConfig } from '@/types/company-config';
import type { EmployeeProfileSlice, UserCompanyMembership } from '@/types/rbac';
import type { Permission, UserEntity, UserRole } from '@/types/user';

import { ensureFirestoreAuthReady } from './auth';
import { loadCompanyAppConfig } from './company-config';
import { getFirebaseDb } from './index';
import { listUserCompanyMemberships } from '@/services/firestore/company-membership-service';

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

/** Fast path: user doc + memberships — no company reads (safe before RBAC bootstrap). */
export async function loadFastSessionBootstrap(authUser: User): Promise<{
  profile: UserEntity;
  memberships: UserCompanyMembership[];
}> {
  try {
    await ensureFirestoreAuthReady(authUser);
    const db = getFirebaseDb();

    let userDoc: UserDocShape | undefined;
    try {
      const userSnapshot = await getDoc(doc(db, 'users', authUser.uid));
      userDoc = userSnapshot.data() as UserDocShape | undefined;
    } catch (error) {
      console.warn('User doc read skipped:', error);
    }

    let memberships: UserCompanyMembership[] = [];
    try {
      memberships = await listUserCompanyMemberships(authUser.uid);
    } catch (error) {
      console.warn('Memberships read skipped:', error);
    }

    let profile = mapUserDoc(authUser.uid, authUser, userDoc);
    let companyId = resolveCompanyIdFromMemberships(profile.companyId, memberships);

    if (!companyId) {
      companyId = await resolveOwnedCompanyId(authUser.uid);
    }

    if (companyId) {
      const membership = memberships.find((entry) => normalizeCompanyId(entry.companyId) === companyId);
      profile = {
        ...profile,
        companyId,
        role: membership?.role ?? profile.role,
      };
    }

    return { profile, memberships };
  } catch (error) {
    console.warn('Fast session bootstrap fallback:', error);
    return {
      profile: buildFallbackProfile(authUser),
      memberships: [],
    };
  }
}

/** @deprecated Use loadFastSessionBootstrap */
export async function loadFastUserProfile(authUser: User): Promise<UserEntity> {
  const session = await loadFastSessionBootstrap(authUser);
  return session.profile;
}

async function loadMemberships(uid: string): Promise<UserCompanyMembership[]> {
  return listUserCompanyMemberships(uid);
}

function resolveCompanyIdFromMemberships(
  companyId: string | null | undefined,
  memberships: UserCompanyMembership[],
): string | null {
  if (isProductionCompanyId(companyId)) {
    return normalizeCompanyId(companyId);
  }
  const membership = memberships.find((entry) => isProductionCompanyId(entry.companyId));
  return membership ? normalizeCompanyId(membership.companyId) : null;
}

/** When users/{uid}.companyId is empty, resolve workspace from owned companies. */
export async function resolveOwnedCompanyId(uid: string): Promise<string | null> {
  try {
    const db = getFirebaseDb();
    const owned = await getDocs(
      query(collection(db, 'companies'), where('ownerId', '==', uid), limit(10)),
    );
    if (!owned.empty) {
      const preferred = owned.docs.find((entry) => entry.id !== DEFAULT_COMPANY_ID);
      return preferred?.id ?? owned.docs[0]?.id ?? null;
    }

    const defaultSnap = await getDoc(doc(db, 'companies', DEFAULT_COMPANY_ID));
    if (!defaultSnap.exists()) return null;
    const ownerId = (defaultSnap.data() as { ownerId?: string }).ownerId;
    return ownerId === uid ? DEFAULT_COMPANY_ID : null;
  } catch (error) {
    console.warn('Owned company resolve skipped:', error);
    return null;
  }
}

export async function hydrateEffectiveProfile(authUser: User): Promise<{
  profile: UserEntity;
  companyConfig: CompanyAppConfig | null;
  memberships: UserCompanyMembership[];
  activeCompanyName: string | null;
  workspaceBlock: WorkspaceAccessBlock | null;
}> {
  try {
    await ensureFirestoreAuthReady(authUser);
    try {
      await ensureUserDocument(authUser);
    } catch (error) {
      console.warn('User doc ensure skipped:', error);
    }

    const db = getFirebaseDb();
    const userRef = doc(db, 'users', authUser.uid);
    let userDoc: UserDocShape | undefined;
    try {
      const userSnapshot = await getDoc(userRef);
      userDoc = userSnapshot.data() as UserDocShape | undefined;
    } catch (error) {
      console.warn('User doc enrich skipped:', error);
    }
    const baseProfile = mapUserDoc(authUser.uid, authUser, userDoc);
    let memberships: UserCompanyMembership[] = [];
    try {
      memberships = await loadMemberships(authUser.uid);
    } catch (error) {
      console.warn('Memberships enrich skipped:', error);
    }

    let companyId = resolveCompanyIdFromMemberships(baseProfile.companyId, memberships);
    if (!companyId) {
      companyId = await resolveOwnedCompanyId(authUser.uid);
    }

    if (!companyId) {
      return {
        profile: baseProfile,
        companyConfig: null,
        memberships,
        activeCompanyName: null,
        workspaceBlock: resolveWorkspaceAccessBlock({
          companyId: null,
          companyName: null,
          isCompanyOwner: false,
          employeeExists: false,
          employeeIsActive: null,
          membershipsCount: memberships.length,
        }),
      };
    }

    const companyRef = doc(db, 'companies', companyId);
    const employeeRef = doc(db, 'companies', companyId, 'employees', authUser.uid);

    let companySnapshot: Awaited<ReturnType<typeof getDoc>> | null = null;
    let employeeSnapshot: Awaited<ReturnType<typeof getDoc>> | null = null;
    let companyConfig: CompanyAppConfig | null = null;

    try {
      [companySnapshot, employeeSnapshot, companyConfig] = await Promise.all([
        getDoc(companyRef),
        getDoc(employeeRef),
        loadCompanyAppConfig(companyId),
      ]);
    } catch (error) {
      console.warn('Company profile enrich partial:', error);
    }

    const companyDoc = companySnapshot?.exists()
      ? ((companySnapshot.data() as CompanyDocShape | undefined) ?? undefined)
      : undefined;
    const employeeDoc = employeeSnapshot?.exists()
      ? (employeeSnapshot.data() as {
          role?: UserRole;
          permissions?: Permission[];
          isActive?: boolean;
          fullName?: string;
        })
      : null;

    const merged = mergeProfileWithEmployee({ ...baseProfile, companyId }, employeeDoc);
    const activeCompanyName = companySnapshot?.exists()
      ? readCompanyDisplayName(companyDoc, companyId)
      : memberships.find((entry) => normalizeCompanyId(entry.companyId) === companyId)?.name ?? null;

    const isCompanyOwner = companyDoc?.ownerId === authUser.uid;
    const workspaceBlock = resolveWorkspaceAccessBlock({
      companyId,
      companyName: activeCompanyName,
      isCompanyOwner: isCompanyOwner === true,
      employeeExists: employeeSnapshot?.exists() === true,
      employeeIsActive: employeeDoc?.isActive ?? null,
      membershipsCount: memberships.length,
    });

    return {
      profile: {
        ...merged,
        companyId,
        isCompanyOwner: isCompanyOwner === true,
      },
      companyConfig,
      memberships,
      activeCompanyName,
      workspaceBlock,
    };
  } catch (error) {
    console.warn('Profile hydrate fallback:', error);
    const fast = await loadFastSessionBootstrap(authUser);
    let companyId = resolveCompanyIdFromMemberships(fast.profile.companyId, fast.memberships);
    if (!companyId) {
      companyId = await resolveOwnedCompanyId(authUser.uid);
    }
    return {
      profile: companyId ? { ...fast.profile, companyId, isCompanyOwner: true } : fast.profile,
      companyConfig: null,
      memberships: fast.memberships,
      activeCompanyName: null,
      workspaceBlock: null,
    };
  }
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

/**
 * Best-effort cleanup before Auth user deletion.
 * Marks company membership inactive and removes the user profile document.
 * Company business data is intentionally kept for other members.
 */
export async function deleteUserAccountData(authUser: User): Promise<void> {
  const db = getFirebaseDb();
  const userRef = doc(db, 'users', authUser.uid);

  try {
    const snapshot = await getDoc(userRef);
    const companyId = String((snapshot.data() as UserDocShape | undefined)?.companyId ?? '').trim();
    if (companyId) {
      await setDoc(
        doc(db, 'companies', normalizeCompanyId(companyId), 'employees', authUser.uid),
        {
          isActive: false,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  } catch (error) {
    console.warn('Employee deactivation deferred:', error);
  }

  try {
    await deleteDoc(userRef);
  } catch (error) {
    console.warn('User profile delete deferred:', error);
  }
}
