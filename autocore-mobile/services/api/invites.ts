import { mobilePostFlexible } from '@/services/api/mobile-client';
import { mobileApi } from '@/services/api/endpoints';
import type { UserRole } from '@/types/user';

type SendInviteApiResponse = {
  inviteId?: string;
  joinUrl?: string;
  email?: string;
  error?: string;
};

export type SendEmployeeInviteResult =
  | {
      kind: 'sent';
      email: string;
      inviteId?: string;
      joinUrl?: string;
    }
  | {
      kind: 'manual_link';
      message: string;
      inviteId?: string;
      joinUrl: string;
    };

export async function sendEmployeeInviteEmail(input: {
  email: string;
  role: UserRole;
  ttlHours?: number;
}): Promise<SendEmployeeInviteResult> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes('@')) {
    throw new Error('Enter a valid email');
  }

  const { ok, status, data } = await mobilePostFlexible<SendInviteApiResponse>(mobileApi.invitesSend, {
    email,
    role: input.role,
    ttlHours: input.ttlHours ?? 72,
  });

  if (ok) {
    return {
      kind: 'sent',
      email: data.email ?? email,
      inviteId: data.inviteId,
      joinUrl: data.joinUrl,
    };
  }

  if (status === 503 && data.joinUrl) {
    return {
      kind: 'manual_link',
      message: 'Email isn’t set up — share the link yourself.',
      inviteId: data.inviteId,
      joinUrl: data.joinUrl,
    };
  }

  throw new Error(data.error ?? 'Failed to send invite');
}
