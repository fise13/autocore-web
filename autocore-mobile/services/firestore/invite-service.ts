import { mobilePost } from '@/services/api/mobile-client';
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
