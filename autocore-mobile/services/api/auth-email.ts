import { getPublicApiBaseUrl } from '@/services/api/api-base-url';

type AuthEmailApiError = {
  error?: string;
  retryAfterSec?: number;
  fallback?: string;
};

export type PasswordResetDelivery = 'resend' | 'firebase';

export async function sendPasswordResetViaApi(email: string): Promise<PasswordResetDelivery> {
  const baseUrl = getPublicApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/auth/send-password-reset`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.trim() }),
  });

  const payload = (await response.json().catch(() => null)) as AuthEmailApiError | null;

  if (response.status === 429) {
    throw new Error(payload?.error ?? 'Подождите перед повторной отправкой');
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Не удалось отправить письмо для сброса пароля');
  }

  if (payload?.fallback === 'firebase') {
    return 'firebase';
  }

  return 'resend';
}
