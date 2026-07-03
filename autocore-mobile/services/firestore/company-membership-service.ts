import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { readCompanyDisplayName } from '@/lib/company-display-name';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import type { UserCompanyMembership } from '@/types/rbac';
import type { UserRole } from '@/types/user';
import { getFirebaseDb } from '@/services/firebase';

export async function recordUserCompanyMembership(
  userId: string,
  companyId: string,
  role: UserRole,
): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  if (!userId || !normalizedCompanyId) return;

  const membershipRef = doc(getFirebaseDb(), 'users', userId, 'memberships', normalizedCompanyId);
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

export async function listUserCompanyMemberships(userId: string): Promise<UserCompanyMembership[]> {
  if (!userId) return [];
  const snapshot = await getDocs(collection(getFirebaseDb(), 'users', userId, 'memberships'));
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

export async function switchActiveCompany(userId: string, companyId: string): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const membershipSnap = await getDoc(
    doc(getFirebaseDb(), 'users', userId, 'memberships', normalizedCompanyId),
  );
  if (!membershipSnap.exists()) {
    throw new Error('Нет доступа к этой компании');
  }

  await updateDoc(doc(getFirebaseDb(), 'users', userId), {
    companyId: normalizedCompanyId,
  });
}
