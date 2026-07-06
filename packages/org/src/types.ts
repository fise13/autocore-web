import type { UserRole } from '@autocore/rbac';

/** Canonical invite lifecycle states. */
export const INVITE_STATUSES = [
  'pending',
  'accepted',
  'expired',
  'cancelled',
  'declined',
] as const;

export type InviteStatus = (typeof INVITE_STATUSES)[number];

/** Legacy alias kept for backward compatibility with existing Firestore docs. */
export type LegacyInviteStatus = 'pending' | 'used' | 'expired';

export type InviteRecord = {
  id: string;
  code: string;
  token?: string;
  email?: string;
  companyId: string;
  role: UserRole;
  createdAt?: string;
  expiresAt: string;
  createdBy: string;
  used: boolean;
  status?: InviteStatus | LegacyInviteStatus;
  acceptedAt?: string;
  acceptedBy?: string;
  cancelledAt?: string;
  revokedBy?: string;
  declinedAt?: string;
  declinedBy?: string;
};

export type InvitePreview = {
  token: string;
  email: string | null;
  companyId: string;
  companyName: string;
  companyLogoUrl?: string | null;
  role: UserRole;
  status: InviteStatus;
  expiresAt: string;
  inviterName?: string | null;
  canAccept: boolean;
};

export type UserCompanyMembershipRecord = {
  companyId: string;
  role: UserRole;
  name?: string;
  logoUrl?: string | null;
  planLabel?: string | null;
};

export type AcceptInviteOptions = {
  switchToCompany?: boolean;
};

export type AcceptInviteResult = {
  companyId: string;
  companyName: string;
  role: UserRole;
  switched: boolean;
  alreadyMember: boolean;
};
