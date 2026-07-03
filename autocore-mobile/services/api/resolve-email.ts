import { getPublicApiBaseUrl } from '@/services/api/api-base-url';

type ResolveEmailResponse = {
  exists: boolean;
  methods: string[];
};

export type ResolveEmailLookupResult = {
  methods: string[];
  /** `true` when `/api/auth/resolve-email` returned a definitive answer. */
  apiResolved: boolean;
};

function normalizeMethods(methods: string[]): string[] {
  if (methods.length === 0) return [];
  return methods;
}

/**
 * Server-side email lookup (Firebase Admin). Works when client enumeration protection is on.
 */
export async function resolveEmailSignInMethodsLookup(email: string): Promise<ResolveEmailLookupResult> {
  const baseUrl = getPublicApiBaseUrl();
  const trimmedEmail = email.trim().toLowerCase();

  try {
    const response = await fetch(`${baseUrl}/api/auth/resolve-email`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: trimmedEmail }),
    });

    if (response.status === 429) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? 'Слишком много попыток. Попробуйте позже.');
    }

    if (response.ok) {
      const payload = (await response.json()) as ResolveEmailResponse;
      if (!payload.exists) {
        return { methods: [], apiResolved: true };
      }
      const methods = payload.methods.length > 0 ? payload.methods : ['password'];
      return { methods: normalizeMethods(methods), apiResolved: true };
    }
  } catch (lookupError) {
    if (lookupError instanceof Error && /попыток/i.test(lookupError.message)) {
      throw lookupError;
    }
    console.warn('resolve-email API fallback:', lookupError);
  }

  return { methods: [], apiResolved: false };
}

/** @deprecated Use resolveEmailSignInMethodsLookup — kept for narrow imports. */
export async function resolveEmailSignInMethodsViaApi(email: string): Promise<string[] | null> {
  const result = await resolveEmailSignInMethodsLookup(email);
  if (!result.apiResolved) return null;
  return result.methods;
}
