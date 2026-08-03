export const ORG_ERROR_CODES = [
  'invite_not_found',
  'invite_expired',
  'invite_cancelled',
  'invite_declined',
  'invite_already_accepted',
  'invite_revoked',
  'invite_invalid_token',
  'email_mismatch',
  'already_member',
  'org_deleted',
  'org_not_found',
  'owner_cannot_leave',
  'sole_owner_cannot_leave',
  'not_a_member',
  'permission_denied',
  'confirmation_mismatch',
  'network_error',
  'server_unavailable',
  'auth_required',
  'unexpected',
] as const;

export type OrgErrorCode = (typeof ORG_ERROR_CODES)[number];

export type OrgErrorCopy = {
  title: string;
  message: string;
  action?: string;
};

export const ORG_ERROR_COPY: Record<OrgErrorCode, OrgErrorCopy> = {
  invite_not_found: {
    title: 'Invite not found',
    message: 'This link is invalid or outdated. Ask an admin to send a new invite.',
    action: 'Home',
  },
  invite_expired: {
    title: 'Invite expired',
    message: 'Ask an admin to send a new invite.',
    action: 'Request new',
  },
  invite_cancelled: {
    title: 'Invite revoked',
    message: 'An admin cancelled this invite. Contact the organization.',
  },
  invite_declined: {
    title: 'Invite declined',
    message: 'You declined this invite.',
  },
  invite_already_accepted: {
    title: 'Already in the organization',
    message: 'This invite was already accepted. Open the workspace.',
    action: 'Open',
  },
  invite_revoked: {
    title: 'Invite revoked',
    message: 'An admin cancelled this invite.',
  },
  invite_invalid_token: {
    title: 'Invalid link',
    message: 'Check the link from the email or ask for a new invite.',
  },
  email_mismatch: {
    title: 'Wrong account',
    message: 'This invite was sent to a different email. Sign in with that address or switch accounts.',
    action: 'Switch account',
  },
  already_member: {
    title: 'Already in the organization',
    message: 'Your account is already a member of this organization.',
    action: 'Open',
  },
  org_deleted: {
    title: 'Organization deleted',
    message: 'This organization no longer exists.',
  },
  org_not_found: {
    title: 'Organization not found',
    message: 'The company does not exist or was deleted.',
  },
  owner_cannot_leave: {
    title: 'Cannot leave organization',
    message: 'Owners cannot leave. Transfer ownership or delete the organization in Danger zone.',
    action: 'Settings',
  },
  sole_owner_cannot_leave: {
    title: 'You are the only owner',
    message:
      'Transfer ownership to another member, or delete the organization in Danger zone. Leaving would leave the company without an owner.',
    action: 'Settings',
  },
  not_a_member: {
    title: 'No access',
    message: 'You are not a member of this organization.',
  },
  permission_denied: {
    title: 'Insufficient permissions',
    message: 'You do not have permission for this action.',
  },
  confirmation_mismatch: {
    title: 'Confirmation did not match',
    message: 'Type the exact organization name to confirm.',
  },
  network_error: {
    title: 'No connection',
    message: 'Check your internet connection and try again.',
    action: 'Retry',
  },
  server_unavailable: {
    title: 'Server unavailable',
    message: 'Try again later.',
    action: 'Retry',
  },
  auth_required: {
    title: 'Sign-in required',
    message: 'Sign in or register to accept the invite.',
    action: 'Sign in',
  },
  unexpected: {
    title: 'Something went wrong',
    message: 'Could not complete the action. Try again.',
    action: 'Retry',
  },
};

export class OrgError extends Error {
  code: OrgErrorCode;
  status: number;

  constructor(code: OrgErrorCode, status = 400, message?: string) {
    const copy = ORG_ERROR_COPY[code];
    super(message ?? copy.message);
    this.name = 'OrgError';
    this.code = code;
    this.status = status;
  }

  get copy(): OrgErrorCopy {
    return ORG_ERROR_COPY[this.code];
  }
}

export function mapToOrgError(error: unknown): OrgError {
  if (error instanceof OrgError) return error;

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('permission-denied') || msg.includes('недостаточно прав')) {
      return new OrgError('permission_denied', 403);
    }
    if (msg.includes('истёк') || msg.includes('expired')) {
      return new OrgError('invite_expired', 410);
    }
    if (msg.includes('отозван') || msg.includes('cancelled') || msg.includes('revoked')) {
      return new OrgError('invite_cancelled', 410);
    }
    if (msg.includes('уже') && msg.includes('организа')) {
      return new OrgError('already_member', 409);
    }
    if (msg.includes('другой email') || msg.includes('email')) {
      return new OrgError('email_mismatch', 409);
    }
    if (msg.includes('не найден')) {
      return new OrgError('invite_not_found', 404);
    }
    if (msg.includes('авторизац') || msg.includes('войдите')) {
      return new OrgError('auth_required', 401);
    }
    return new OrgError('unexpected', 500, error.message);
  }

  return new OrgError('unexpected', 500);
}

export function orgErrorResponse(error: unknown): { code: OrgErrorCode; error: string; title: string; action?: string; status: number } {
  const orgError = mapToOrgError(error);
  return {
    code: orgError.code,
    error: orgError.message,
    title: orgError.copy.title,
    action: orgError.copy.action,
    status: orgError.status,
  };
}
