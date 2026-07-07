import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { toDateFromFirestore } from '@/lib/firestore-timestamp';
import { mobilePost } from '@/services/api/mobile-client';
import { getFirebaseDb } from '@/services/firebase';
import type { InviteDocument } from '@/types/rbac';
import type { UserRole } from '@/types/user';

type CreateInviteApiResponse = {
  inviteId: string;
  code: string;
  token: string;
  joinUrl: string;
  email: string | null;
  error?: string;
};

function mapInviteDoc(id: string, companyId: string, data: Record<string, unknown>): InviteDocument | null {
  const expiresAt = toDateFromFirestore(data.expiresAt);
  if (!expiresAt) return null;
  const used = Boolean(data.used ?? false);
  const status =
    data.status === 'used' ||
    data.status === 'expired' ||
    data.status === 'pending' ||
    data.status === 'accepted' ||
    data.status === 'cancelled' ||
    data.status === 'declined'
      ? (data.status as InviteDocument['status'])
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

/** Creates invite via server API so inbox notifications are always emitted. */
export async function createCompanyInvite(input: {
  companyId: string;
  role: UserRole;
  createdBy: string;
  ttlHours: number;
}): Promise<InviteDocument> {
  const response = await mobilePost<CreateInviteApiResponse>('/api/invites/create', {
    role: input.role,
    ttlHours: input.ttlHours,
  });

  const expiresAt = new Date(Date.now() + Math.max(input.ttlHours, 1) * 3600 * 1000);

  return {
    id: response.inviteId,
    code: response.code,
    token: response.token,
    companyId: input.companyId,
    role: input.role,
    expiresAt,
    createdBy: input.createdBy,
    used: false,
    status: 'pending',
    email: response.email ?? undefined,
  };
}
