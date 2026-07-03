import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';

import { generateInviteCode, generateInviteToken } from '@/lib/invites/invite-code';
import { toDateFromFirestore } from '@/lib/firestore-timestamp';
import { getFirebaseDb } from '@/services/firebase';
import type { InviteDocument } from '@/types/rbac';
import type { UserRole } from '@/types/user';

function mapInviteDoc(id: string, companyId: string, data: Record<string, unknown>): InviteDocument | null {
  const expiresAt = toDateFromFirestore(data.expiresAt);
  if (!expiresAt) return null;
  const used = Boolean(data.used ?? false);
  const status =
    data.status === 'used' || data.status === 'expired' || data.status === 'pending'
      ? data.status
      : used
        ? 'used'
        : expiresAt.getTime() <= Date.now()
          ? 'expired'
          : 'pending';

  return {
    id,
    code: String(data.code ?? ''),
    token: typeof data.token === 'string' ? data.token : undefined,
    email: typeof data.email === 'string' ? data.email : undefined,
    companyId: String(data.companyId ?? companyId),
    role: String(data.role ?? 'employee') as UserRole,
    createdAt: toDateFromFirestore(data.createdAt),
    expiresAt,
    createdBy: String(data.createdBy ?? ''),
    used,
    status,
  };
}

export function subscribeCompanyInvites(
  companyId: string,
  onData: (invites: InviteDocument[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const invitesQuery = query(
    collection(getFirebaseDb(), 'invites'),
    where('companyId', '==', companyId),
    orderBy('createdAt', 'desc'),
    limit(50),
  );

  return onSnapshot(
    invitesQuery,
    (snapshot) => {
      const invites = snapshot.docs
        .map((entry) => mapInviteDoc(entry.id, companyId, entry.data() as Record<string, unknown>))
        .filter((entry): entry is InviteDocument => entry != null);
      onData(invites);
    },
    (error) => onError?.(error),
  );
}

export async function createCompanyInvite(input: {
  companyId: string;
  role: UserRole;
  createdBy: string;
  ttlHours: number;
}): Promise<InviteDocument> {
  const ttlMs = Math.max(input.ttlHours, 1) * 3600 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateInviteCode();
    const existing = await getDocs(
      query(collection(getFirebaseDb(), 'invites'), where('code', '==', code), limit(1)),
    );
    if (!existing.empty) continue;

    const token = generateInviteToken();
    const ref = await addDoc(collection(getFirebaseDb(), 'invites'), {
      code,
      token,
      companyId: input.companyId,
      role: input.role,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      createdBy: input.createdBy,
      used: false,
      status: 'pending',
    });

    return {
      id: ref.id,
      code,
      token,
      companyId: input.companyId,
      role: input.role,
      expiresAt,
      createdBy: input.createdBy,
      used: false,
      status: 'pending',
    };
  }

  throw new Error('Не удалось сгенерировать уникальный код приглашения, попробуйте ещё раз');
}

export async function deleteCompanyInvite(inviteId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'invites', inviteId));
}
