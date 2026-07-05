import { getPublicApiBaseUrl } from '@/services/api/api-base-url';

export type AppleSignInApiPayload = {
  idToken: string;
  rawNonce: string;
  authorizationCode?: string | null;
  email?: string | null;
  fullName?: string | null;
};

export async function exchangeAppleSignInViaApi(
  payload: AppleSignInApiPayload,
): Promise<string> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/mobile/auth/apple`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as {
    customToken?: string;
    error?: string;
  };

  if (!response.ok || !body.customToken?.trim()) {
    throw new Error(body.error?.trim() || 'Не удалось подтвердить вход через Apple');
  }

  return body.customToken.trim();
}
