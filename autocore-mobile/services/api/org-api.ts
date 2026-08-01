import type { AcceptInviteResult, InvitePreview } from '@autocore/org';

import { getPublicApiBaseUrl } from '@/services/api/api-base-url';
import { mobilePost } from '@/services/api/mobile-client';

export async function fetchInvitePreview(token: string): Promise<{ preview: InvitePreview }> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/invites/${encodeURIComponent(token)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to load invitation');
  }
  return payload as { preview: InvitePreview };
}

export function acceptInvite(
  token: string,
  switchToCompany = true,
): Promise<{ ok: boolean; result: AcceptInviteResult }> {
  return mobilePost<{ ok: boolean; result: AcceptInviteResult }>('/api/invites/accept', {
    token,
    switchToCompany,
  });
}

export function acceptInviteByCode(
  code: string,
  switchToCompany = true,
): Promise<{ ok: boolean; result: AcceptInviteResult }> {
  return mobilePost<{ ok: boolean; result: AcceptInviteResult }>('/api/invites/accept-code', {
    code,
    switchToCompany,
  });
}

export function declineInvite(token: string): Promise<{ ok: boolean }> {
  return mobilePost<{ ok: boolean }>('/api/invites/decline', { token });
}

export function removeMemberFromCompany(
  companyId: string,
  userId: string,
): Promise<{ ok: boolean; nextCompanyId: string | null }> {
  return mobilePost<{ ok: boolean; nextCompanyId: string | null }>('/api/org/members/remove', {
    companyId,
    userId,
  });
}

export function setMemberActive(
  companyId: string,
  userId: string,
  isActive: boolean,
): Promise<{ ok: boolean }> {
  return mobilePost<{ ok: boolean }>('/api/org/members/set-active', {
    companyId,
    userId,
    isActive,
  });
}

export function leaveOrganization(companyId: string): Promise<{ ok: boolean; nextCompanyId: string | null }> {
  return mobilePost<{ ok: boolean; nextCompanyId: string | null }>('/api/org/leave', { companyId });
}

export function deleteOrganization(
  companyId: string,
  confirmationName: string,
): Promise<{ ok: boolean }> {
  return mobilePost<{ ok: boolean }>('/api/org/delete', { companyId, confirmationName });
}

export function resendInvite(inviteId: string): Promise<{ ok: boolean; joinUrl: string }> {
  return mobilePost<{ ok: boolean; joinUrl: string }>('/api/invites/resend', { inviteId });
}

export function revokeInvite(inviteId: string): Promise<{ ok: boolean }> {
  return mobilePost<{ ok: boolean }>('/api/invites/revoke', { inviteId });
}
