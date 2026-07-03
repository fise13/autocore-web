import { getFirebaseAuth } from '@/services/firebase';
import { getPublicApiBaseUrl } from '@/services/api/api-base-url';

function getApiBaseUrl(): string {
  return getPublicApiBaseUrl();
}

export class MobileApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'MobileApiError';
    this.status = status;
  }
}

async function getBearerToken(forceRefresh = false): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new MobileApiError('Требуется авторизация', 401);
  }
  const token = await user.getIdToken(forceRefresh);
  if (!token) {
    throw new MobileApiError('Не удалось получить токен', 401);
  }
  return token;
}

export async function mobileFetch<T>(
  path: string,
  init?: RequestInit & { retryOnUnauthorized?: boolean },
): Promise<T> {
  const retryOnUnauthorized = init?.retryOnUnauthorized ?? true;
  const { retryOnUnauthorized: _, ...requestInit } = init ?? {};

  const execute = async (forceRefresh: boolean) => {
    const token = await getBearerToken(forceRefresh);
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...requestInit,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(requestInit.headers ?? {}),
      },
    });

    if (response.status === 401 && retryOnUnauthorized && !forceRefresh) {
      return execute(true);
    }

    const text = await response.text();
    let payload: { error?: string; message?: string } | null = null;
    if (text) {
      try {
        payload = JSON.parse(text) as { error?: string; message?: string };
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const message = payload?.error ?? payload?.message ?? (text || `HTTP ${response.status}`);
      throw new MobileApiError(message, response.status);
    }

    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  };

  return execute(false);
}

export function mobileGet<T>(path: string): Promise<T> {
  return mobileFetch<T>(path, { method: 'GET' });
}

export function mobilePost<T>(path: string, body?: unknown): Promise<T> {
  return mobileFetch<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function mobilePostFlexible<T>(
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: T }> {
  const execute = async (forceRefresh: boolean) => {
    const token = await getBearerToken(forceRefresh);
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 401 && !forceRefresh) {
      return execute(true);
    }

    const text = await response.text();
    let data = {} as T;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = { error: text } as T;
      }
    }

    return { ok: response.ok, status: response.status, data };
  };

  return execute(false);
}

export async function mobileFetchBlob(
  path: string,
  init?: RequestInit & { retryOnUnauthorized?: boolean },
): Promise<ArrayBuffer> {
  const retryOnUnauthorized = init?.retryOnUnauthorized ?? true;
  const { retryOnUnauthorized: _, ...requestInit } = init ?? {};

  const execute = async (forceRefresh: boolean) => {
    const token = await getBearerToken(forceRefresh);
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...requestInit,
      headers: {
        Accept: 'application/pdf',
        Authorization: `Bearer ${token}`,
        ...(requestInit.headers ?? {}),
      },
    });

    if (response.status === 401 && retryOnUnauthorized && !forceRefresh) {
      return execute(true);
    }

    if (!response.ok) {
      const text = await response.text();
      let message = text.trim();
      if (text) {
        try {
          const payload = JSON.parse(text) as { error?: string; message?: string };
          message = payload.error ?? payload.message ?? message;
        } catch {
          // keep raw text
        }
      }
      throw new MobileApiError(message || `HTTP ${response.status}`, response.status);
    }

    return response.arrayBuffer();
  };

  return execute(false);
}

export async function mobileUpload<T>(path: string, formData: FormData): Promise<T> {
  const execute = async (forceRefresh: boolean) => {
    const token = await getBearerToken(forceRefresh);
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.status === 401 && !forceRefresh) {
      return execute(true);
    }

    const text = await response.text();
    let payload: { error?: string; message?: string } | null = null;
    if (text) {
      try {
        payload = JSON.parse(text) as { error?: string; message?: string };
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const message = payload?.error ?? payload?.message ?? (text || `HTTP ${response.status}`);
      throw new MobileApiError(message, response.status);
    }

    return JSON.parse(text) as T;
  };

  return execute(false);
}
