import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { toDateFromFirestore } from '@/lib/firestore-timestamp';
import { getFirebaseDb } from '@/services/firebase';
import type { DirectoryPerson, DirectoryPersonStatus } from '@/types/rbac';

function mapDirectoryPerson(
  id: string,
  companyId: string,
  data: Record<string, unknown>,
): DirectoryPerson | null {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) return null;

  const status: DirectoryPersonStatus =
    data.status === 'invited' ? 'invited' : 'named';

  return {
    id,
    companyId: String(data.companyId ?? companyId),
    name,
    createdBy: String(data.createdBy ?? ''),
    createdAt: toDateFromFirestore(data.createdAt),
    status,
    linkedInviteId: typeof data.linkedInviteId === 'string' ? data.linkedInviteId : undefined,
    note: typeof data.note === 'string' ? data.note : undefined,
  };
}

function directoryCollection(companyId: string) {
  return collection(getFirebaseDb(), 'companies', companyId, 'directory');
}

export function subscribeCompanyDirectory(
  companyId: string,
  onData: (people: DirectoryPerson[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const directoryQuery = query(directoryCollection(companyId), orderBy('createdAt', 'desc'));

  return onSnapshot(
    directoryQuery,
    (snapshot) => {
      const people = snapshot.docs
        .map((entry) =>
          mapDirectoryPerson(entry.id, companyId, entry.data() as Record<string, unknown>),
        )
        .filter((entry): entry is DirectoryPerson => entry != null);
      onData(people);
    },
    (error) => onError?.(error),
  );
}

export async function createDirectoryPerson(input: {
  companyId: string;
  name: string;
  createdBy: string;
  note?: string;
}): Promise<DirectoryPerson> {
  const name = input.name.trim();
  if (!name) throw new Error('Name is required');

  const ref = await addDoc(directoryCollection(input.companyId), {
    companyId: input.companyId,
    name,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    status: 'named' satisfies DirectoryPersonStatus,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  });

  return {
    id: ref.id,
    companyId: input.companyId,
    name,
    createdBy: input.createdBy,
    createdAt: new Date(),
    status: 'named',
    note: input.note?.trim() || undefined,
  };
}

export async function markDirectoryPersonInvited(input: {
  companyId: string;
  personId: string;
  inviteId: string;
}): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), 'companies', input.companyId, 'directory', input.personId), {
    status: 'invited' satisfies DirectoryPersonStatus,
    linkedInviteId: input.inviteId,
  });
}

export async function removeDirectoryPerson(companyId: string, personId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'companies', companyId, 'directory', personId));
}
