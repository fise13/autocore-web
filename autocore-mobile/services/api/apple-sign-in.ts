import { getPublicApiBaseUrl } from '@/services/api/api-base-url';
import { fetchJsonWithTimeout } from '@/lib/network/fetch-json';

export type AppleSignInApiPayload = {
  idToken: string;
  rawNonce: string;
  authorizationCode?: string | null;
  email?: string | null;
  fullName?: string | null;
};

type AppleSignInApiResponse = {
  customToken?: string;
  error?: string;
};

export async function exchangeAppleSignInViaApi(
  payload: AppleSignInApiPayload,
): Promise<string> {
  const { ok, status, data } = await fetchJsonWithTimeout<AppleSignInApiResponse>(
    `${getPublicApiBaseUrl()}/api/mobile/auth/apple`,
    {
      method: 'POST',
      timeoutMs: 12_000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (status === 404) {
    throw new Error(
      'Вход через Apple на сервере ещё не обновлён. Войдите по email или попробуйте позже.',
    );
  }

  if (!ok || !data.customToken?.trim()) {
    throw new Error(data.error?.trim() || 'Не удалось подтвердить вход через Apple');
  }

  return data.customToken.trim();
}
