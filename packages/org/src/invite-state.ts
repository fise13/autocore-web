import type { InviteRecord, InviteStatus } from './types';

export function normalizeInviteStatus(record: Pick<InviteRecord, 'status' | 'used' | 'expiresAt'>): InviteStatus {
  const raw = record.status;
  if (raw === 'accepted' || raw === 'used') return 'accepted';
  if (raw === 'cancelled') return 'cancelled';
  if (raw === 'declined') return 'declined';
  if (raw === 'expired') return 'expired';

  if (record.used) return 'accepted';

  const expiresAt = new Date(record.expiresAt);
  if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
    return 'expired';
  }

  return 'pending';
}

export function inviteCanBeAccepted(status: InviteStatus): boolean {
  return status === 'pending';
}

export function emailsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = (a ?? '').trim().toLowerCase();
  const right = (b ?? '').trim().toLowerCase();
  if (!left || !right) return true;
  return left === right;
}

export function inviteRequiresEmailMatch(
  inviteEmail: string | null | undefined,
  userEmail: string | null | undefined,
): boolean {
  const target = (inviteEmail ?? '').trim();
  if (!target) return false;
  return !emailsMatch(target, userEmail);
}

export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  expired: 'Expired',
  cancelled: 'Cancelled',
  declined: 'Declined',
};
