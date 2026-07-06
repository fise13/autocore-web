import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";

import { getFirestoreDb } from "@/infrastructure/firebase/client";
import type { UserCompanyMembership } from "@/infrastructure/firestore/user-company-membership-service";
import { DEFAULT_COMPANY_ID, isUnassignedCompanyId, normalizeCompanyId } from "@/lib/company-id";

export function resolveSessionCompanyIdFromMemberships(
  profileCompanyId: string | null | undefined,
  memberships: UserCompanyMembership[],
): string | null {
  if (!isUnassignedCompanyId(profileCompanyId)) {
    return normalizeCompanyId(profileCompanyId);
  }

  const membership = memberships.find((entry) => !isUnassignedCompanyId(entry.companyId));
  return membership ? normalizeCompanyId(membership.companyId) : null;
}

export async function resolveOwnedCompanyIdClient(uid: string): Promise<string | null> {
  const db = getFirestoreDb();
  const owned = await getDocs(
    query(collection(db, "companies"), where("ownerId", "==", uid), limit(10)),
  );

  if (!owned.empty) {
    const preferred = owned.docs.find((entry) => entry.id !== DEFAULT_COMPANY_ID);
    return preferred?.id ?? owned.docs[0]?.id ?? null;
  }

  const defaultSnap = await getDoc(doc(db, "companies", DEFAULT_COMPANY_ID));
  if (!defaultSnap.exists()) return null;

  const ownerId = String(defaultSnap.data()?.ownerId ?? "");
  return ownerId === uid ? DEFAULT_COMPANY_ID : null;
}

export async function resolveWorkspaceCompanyId(
  uid: string,
  profileCompanyId: string | null | undefined,
  memberships: UserCompanyMembership[],
): Promise<string | null> {
  const fromProfileOrMembership = resolveSessionCompanyIdFromMemberships(
    profileCompanyId,
    memberships,
  );
  if (fromProfileOrMembership) return fromProfileOrMembership;
  return resolveOwnedCompanyIdClient(uid);
}
