import { getPublicApiBaseUrl } from '@/services/api/api-base-url';

type AuthEmailApiError = {
  error?: string;
  retryAfterSec?: number;
  fallback?: string;
};

export type PasswordResetDelivery = 'resend' | 'firebase';

async function postAuthEmailApi(path: string, token: string | null, body?: object): Promise<void> {
  const baseUrl = getPublicApiBaseUrl();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as AuthEmailApiError | null;

  if (response.status === 429) {
    throw new Error(payload?.error ?? 'Please wait before resending');
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Failed to complete the request');
  }
}

export async function sendVerificationEmailViaApi(): Promise<void> {
  const { getFirebaseAuth } = await import('@/services/firebase');
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error('Authentication required');
  }
  const token = await user.getIdToken();
  await postAuthEmailApi('/api/auth/send-verification-email', token);
}

export async function verifyEmailCodeViaApi(code: string): Promise<void> {
  const { getFirebaseAuth } = await import('@/services/firebase');
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error('Authentication required');
  }
  const token = await user.getIdToken();
  await postAuthEmailApi('/api/auth/verify-email-code', token, { code });
}

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
    throw new Error(payload?.error ?? 'Please wait before resending');
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Failed to send the password reset email');
  }

  if (payload?.fallback === 'firebase') {
    return 'firebase';
  }

  return 'resend';
}
