import type { User } from 'firebase/auth';

import { fetchJsonWithTimeout } from '@/lib/network/fetch-json';
import { getPublicApiBaseUrl } from '@/services/api/api-base-url';

export type AppleRevokeOutcome =
  | { status: 'revoked' }
  /** The server has no Sign in with Apple key — deletion continues, gap is real. */
  | { status: 'not-configured' }
  | { status: 'failed'; reason: string };

type AppleRevokeResponse = {
  ok?: boolean;
  configured?: boolean;
  revoked?: boolean;
  error?: string;
};

/**
 * Asks the server to revoke this account's Sign in with Apple grant.
 *
 * Never throws: revocation is a requirement Apple places on us, not a gate the
 * user should be trapped behind. A failure is returned so the caller can report
 * it rather than delete the account while pretending the grant is gone.
 */
export async function revokeAppleGrantViaApi(
  user: User,
  authorizationCode: string,
): Promise<AppleRevokeOutcome> {
  const code = authorizationCode.trim();
  if (!code) {
    return { status: 'failed', reason: 'Apple did not return an authorization code.' };
  }

  try {
    const token = await user.getIdToken();
    const { ok, status, data } = await fetchJsonWithTimeout<AppleRevokeResponse>(
      `${getPublicApiBaseUrl()}/api/mobile/auth/apple/revoke`,
      {
        method: 'POST',
        timeoutMs: 12_000,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authorizationCode: code }),
      },
    );

    // An older deployment without this route must not block deletion.
    if (status === 404) return { status: 'not-configured' };
    if (!ok) {
      return { status: 'failed', reason: data.error?.trim() || `Server returned ${status}.` };
    }
    if (data.configured === false) return { status: 'not-configured' };
    if (data.revoked === false) {
      return { status: 'failed', reason: data.error?.trim() || 'Apple refused the revocation.' };
    }

    return { status: 'revoked' };
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Could not reach the server.',
    };
  }
}
