import { acceptInviteByCode } from '@/services/api/org-api';
import { mapAuthError } from '@/utils/auth-error';

/**
 * Join company via invite code through the server API so team notifications
 * and activity logs are created consistently with web.
 */
export async function joinCompanyWithInviteCode(
  _uid: string,
  rawCode: string,
  switchToCompany = true,
): Promise<void> {
  const inviteCode = rawCode.trim();
  if (!inviteCode) {
    throw new Error('Enter an invite code');
  }

  try {
    await acceptInviteByCode(inviteCode, switchToCompany);
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}
