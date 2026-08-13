import {
  collection,
  doc,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { toDateFromFirestore } from '@/lib/firestore-timestamp';
import { listenQuery } from '@/lib/firestore/trusted-snapshot';
import { removeMemberFromCompany, setMemberActive as setMemberActiveViaApi } from '@/services/api/org-api';
import { getFirebaseDb } from '@/services/firebase';
import type { CompanyEmployee } from '@/types/rbac';
import type { Permission, UserRole } from '@/types/user';

function mapEmployee(companyId: string, id: string, data: Record<string, unknown>): CompanyEmployee {
  return {
    id,
    uid: String(data.uid ?? id),
    companyId: String(data.companyId ?? companyId),
    email: String(data.email ?? ''),
    fullName: String(data.fullName ?? ''),
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    role: (String(data.role ?? 'employee') as UserRole),
    permissions: Array.isArray(data.permissions) ? (data.permissions as Permission[]) : [],
    invitedBy: String(data.invitedBy ?? ''),
    createdAt: toDateFromFirestore(data.createdAt),
    lastActiveAt: toDateFromFirestore(data.lastActiveAt),
    shiftOn: data.shiftOn !== false,
    isActive: data.isActive !== false,
  };
}

export function subscribeCompanyEmployees(
  companyId: string,
  onData: (employees: CompanyEmployee[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const employeesQuery = query(
    collection(getFirebaseDb(), 'companies', companyId, 'employees'),
    orderBy('fullName'),
  );

  return listenQuery(
    employeesQuery,
    (snapshot) => {
      onData(snapshot.docs.map((entry) => mapEmployee(companyId, entry.id, entry.data() as Record<string, unknown>)));
    },
    onError,
  );
}

export async function setEmployeeRole(
  companyId: string,
  employeeId: string,
  role: UserRole,
): Promise<void> {
  if (role === 'owner') {
    throw new Error('OWNER_ROLE_LOCKED');
  }

  const db = getFirebaseDb();
  const employeeRef = doc(db, 'companies', companyId, 'employees', employeeId);
  const [employeeSnap, companySnap] = await Promise.all([
    getDoc(employeeRef),
    getDoc(doc(db, 'companies', companyId)),
  ]);
  const currentRole = String(employeeSnap.data()?.role ?? '');
  const ownerId = String(companySnap.data()?.ownerId ?? '').trim();
  if (currentRole === 'owner' || (ownerId && ownerId === employeeId)) {
    throw new Error('OWNER_ROLE_LOCKED');
  }

  await updateDoc(employeeRef, {
    role,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', employeeId), { role });
}

export async function setEmployeeActive(
  companyId: string,
  employeeId: string,
  isActive: boolean,
): Promise<void> {
  await setMemberActiveViaApi(companyId, employeeId, isActive);
}

export async function setEmployeeShiftOn(
  companyId: string,
  employeeId: string,
  shiftOn: boolean,
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), 'companies', companyId, 'employees', employeeId), {
    shiftOn,
    updatedAt: serverTimestamp(),
  });
}

export async function setEmployeePermissionOverrides(
  companyId: string,
  employeeId: string,
  permissions: Permission[],
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), 'companies', companyId, 'employees', employeeId), {
    permissions,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(getFirebaseDb(), 'users', employeeId), { permissions });
}

export async function removeEmployee(companyId: string, employeeId: string): Promise<void> {
  await removeMemberFromCompany(companyId, employeeId);
}
