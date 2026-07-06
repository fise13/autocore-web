import "server-only";

import type { CompanyAppConfig } from "@/domain/company-config";
import type { Permission, UserEntity, UserRole } from "@/domain/user";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import type { UserCompanyMembership } from "@/infrastructure/firestore/user-company-membership-service";
import { mergeProfileWithEmployee } from "@/lib/auth/resolve-effective-profile";
import { isUnassignedCompanyId, normalizeCompanyId } from "@/lib/company-id";

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

function isAssignedCompanyId(companyId: string | null | undefined): boolean {
  return !isUnassignedCompanyId(companyId);
}

function mapUserDoc(uid: string, data: UserDocShape | undefined): UserEntity {
  const displayName = data?.name?.trim() || data?.displayName?.trim() || null;
  return {
    id: uid,
    email: data?.email ?? "",
    displayName,
    phone: data?.phone ?? null,
    photoURL: data?.photoURL ?? null,
    role: data?.role ?? "employee",
    companyId: data?.companyId ?? null,
    permissions: [],
    isActive: data?.isActive ?? true,
    isCompanyOwner: false,
  };
}

function resolveCompanyId(
  profileCompanyId: string | null | undefined,
  memberships: UserCompanyMembership[],
): string | null {
  if (isAssignedCompanyId(profileCompanyId)) {
    return normalizeCompanyId(profileCompanyId);
  }
  const membership = memberships.find((entry) => isAssignedCompanyId(entry.companyId));
  return membership ? normalizeCompanyId(membership.companyId) : null;
}

async function resolveOwnedCompanyId(
  db: ReturnType<typeof getAdminFirestore>,
  uid: string,
): Promise<string | null> {
  const owned = await db.collection("companies").where("ownerId", "==", uid).limit(10).get();
  if (owned.empty) return null;
  const preferred = owned.docs.find((entry) => entry.id !== "default");
  return (preferred ?? owned.docs[0]).id;
}

async function readUserMemberships(uid: string): Promise<UserCompanyMembership[]> {
  const db = getAdminFirestore();
  const membershipsSnap = await db.collection("users").doc(uid).collection("memberships").get();
  const stored = membershipsSnap.docs
    .filter((entry) => isAssignedCompanyId(entry.id))
    .map((entry) => {
      const companyId = normalizeCompanyId(entry.id);
      const data = entry.data() as { role?: UserRole; name?: string };
      return {
        companyId,
        role: data.role ?? "employee",
        name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : companyId,
      };
    });

  const ownedSnap = await db.collection("companies").where("ownerId", "==", uid).limit(25).get();
  const owned = ownedSnap.docs.map((entry) => ({
    companyId: normalizeCompanyId(entry.id),
    role: "owner" as const,
    name: String(entry.data()?.name ?? entry.id),
  }));

  let employees: UserCompanyMembership[] = [];
  try {
    const employeeSnap = await db.collectionGroup("employees").where("uid", "==", uid).limit(25).get();
    employees = employeeSnap.docs
      .filter((entry) => entry.data()?.isActive !== false)
      .map((entry) => {
        const companyId = normalizeCompanyId(entry.ref.parent.parent?.id ?? "");
        return {
          companyId,
          role: (entry.data()?.role as UserRole) ?? "employee",
          name: companyId,
        };
      })
      .filter((entry) => entry.companyId);
  } catch {
    employees = [];
  }

  const byId = new Map<string, UserCompanyMembership>();
  const rolePriority = (role: UserRole) => {
    if (role === "owner") return 3;
    if (role === "admin") return 2;
    return 1;
  };

  for (const entry of [...stored, ...owned, ...employees]) {
    const existing = byId.get(entry.companyId);
    if (!existing) {
      byId.set(entry.companyId, entry);
      continue;
    }
    if (rolePriority(entry.role) >= rolePriority(existing.role)) {
      byId.set(entry.companyId, { ...entry, name: existing.name !== existing.companyId ? existing.name : entry.name });
    }
  }

  return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name, "ru"));
}

/** Same company resolution as mobile session bootstrap (profile → membership → owned company). */
export async function resolveMobileWorkspaceCompanyId(uid: string): Promise<string | null> {
  const db = getAdminFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return null;

  const userDoc = userSnap.data() as UserDocShape;
  const memberships = await readUserMemberships(uid);
  let companyId = resolveCompanyId(userDoc.companyId, memberships);
  if (!companyId) {
    companyId = await resolveOwnedCompanyId(db, uid);
  }
  return companyId;
}

function readCompanyName(data: Record<string, unknown> | undefined, companyId: string): string {
  const name = String(data?.shortName ?? data?.name ?? data?.legalName ?? "").trim();
  return name || companyId;
}

function mapCompanyAppConfig(data: Record<string, unknown> | undefined): CompanyAppConfig | null {
  if (!data) return null;
  const modules = data.modules;
  if (!modules || typeof modules !== "object") return null;
  return data as unknown as CompanyAppConfig;
}

export type MobileSessionBootstrapPayload = {
  profile: UserEntity | null;
  companyConfig: CompanyAppConfig | null;
  memberships: UserCompanyMembership[];
  activeCompanyName: string | null;
};

export async function buildMobileSessionBootstrap(uid: string): Promise<MobileSessionBootstrapPayload> {
  const db = getAdminFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return {
      profile: null,
      companyConfig: null,
      memberships: [],
      activeCompanyName: null,
    };
  }

  const userDoc = userSnap.data() as UserDocShape;
  const memberships = await readUserMemberships(uid);

  let companyId = resolveCompanyId(userDoc.companyId, memberships);
  if (!companyId) {
    companyId = await resolveOwnedCompanyId(db, uid);
  }
  if (!companyId) {
    return {
      profile: mapUserDoc(uid, userDoc),
      companyConfig: null,
      memberships,
      activeCompanyName: null,
    };
  }

  const [companySnap, employeeSnap, settingsSnap] = await Promise.all([
    db.collection("companies").doc(companyId).get(),
    db.collection("companies").doc(companyId).collection("employees").doc(uid).get(),
    db.collection("companies").doc(companyId).collection("settings").doc("app").get(),
  ]);

  const companyData = companySnap.exists ? companySnap.data() : undefined;
  const employeeData = employeeSnap.exists ? employeeSnap.data() : null;
  const merged = mergeProfileWithEmployee(mapUserDoc(uid, { ...userDoc, companyId }), employeeData
    ? {
        role: employeeData.role as UserRole | undefined,
        permissions: Array.isArray(employeeData.permissions)
          ? (employeeData.permissions as Permission[])
          : undefined,
        isActive: typeof employeeData.isActive === "boolean" ? employeeData.isActive : undefined,
        fullName: typeof employeeData.fullName === "string" ? employeeData.fullName : undefined,
      }
    : null);

  const membership = memberships.find((entry) => normalizeCompanyId(entry.companyId) === companyId);
  const activeCompanyName = companySnap.exists
    ? readCompanyName(companyData, companyId)
    : membership?.name ?? null;

  if (companySnap.exists && membership) {
    membership.name = activeCompanyName ?? membership.name;
  }

  return {
    profile: {
      ...merged,
      companyId,
      isCompanyOwner: companyData?.ownerId === uid,
    },
    companyConfig: settingsSnap.exists
      ? mapCompanyAppConfig(settingsSnap.data() as Record<string, unknown>)
      : null,
    memberships,
    activeCompanyName,
  };
}
