import { getFirebaseAuth } from '@/services/firebase';
import { getPublicApiBaseUrl } from '@/services/api/api-base-url';
import { enqueueMutation, shouldQueueMutation } from '@/lib/offline/mutation-outbox';
import { isNetworkError } from '@/lib/offline/network-error';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import { useAuthStore } from '@/store/auth-store';

function getApiBaseUrl(): string {
  return getPublicApiBaseUrl();
}

function resolveApiCompanyIdHeader(): Record<string, string> {
  const auth = useAuthStore.getState();
  const companyId = resolveSessionCompanyId(auth.profile, auth.memberships);
  return companyId ? { 'X-Company-Id': companyId } : {};
}

export class MobileApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'MobileApiError';
    this.status = status;
  }
}

function looksLikeHtmlBody(text: string): boolean {
  const trimmed = text.trim();
  return (
    /^<!DOCTYPE/i.test(trimmed) ||
    /^<html[\s>]/i.test(trimmed) ||
    trimmed.includes('self.__next_f.push') ||
    trimmed.includes('/_next/static/')
  );
}

/** Never surface Next.js HTML / RSC flight payloads in toasts or UI. */
function humanizeApiErrorBody(text: string, status: number): string {
  const trimmed = text.trim();
  if (!trimmed) return `HTTP ${status}`;

  if (looksLikeHtmlBody(trimmed)) {
    if (status === 404 || status === 200) {
      return 'API not found on the server. The web app needs to be deployed.';
    }
    if (status >= 500) {
      return 'Server error. Please try again later.';
    }
    return `Server returned HTML instead of JSON (HTTP ${status}).`;
  }

  if (trimmed.length > 280) {
    return `${trimmed.slice(0, 277)}…`;
  }
  return trimmed;
}

function assertJsonApiResponse(text: string, status: number): void {
  if (!text || !looksLikeHtmlBody(text)) return;
  // Production SPA catch-alls often return HTML with HTTP 200 for missing
  // `/api/*` routes. Treat that as a terminal client error, not offline retry.
  throw new MobileApiError(
    humanizeApiErrorBody(text, status),
    status === 200 ? 404 : status,
  );
}

function parseJsonPayload(text: string): { error?: string; message?: string } | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as { error?: string; message?: string };
  } catch {
    return null;
  }
}

async function getBearerToken(forceRefresh = false): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new MobileApiError('Authorization required', 401);
  }
  const online = useAuthStore.getState().isOnline;
  try {
    const token = await user.getIdToken(forceRefresh && online);
    if (!token) {
      throw new MobileApiError('Failed to get token', 401);
    }
    return token;
  } catch (error) {
    if (!online || isNetworkError(error)) {
      throw new MobileApiError('No internet connection.', 0);
    }
    throw error;
  }
}

export type MobileFetchInit = RequestInit & {
  retryOnUnauthorized?: boolean;
  queueWhenOffline?: boolean;
};

function bodyAsString(body: BodyInit | null | undefined): string | undefined {
  return typeof body === 'string' ? body : undefined;
}

function defaultQueueWhenOffline(path: string, method: string): boolean {
  const verb = method.toUpperCase();
  if (verb === 'GET' || verb === 'HEAD') return false;
  if (path.includes('/engine-intake')) return false;
  if (path.includes('/subscriptions')) return false;
  if (path.includes('/invites')) return false;
  if (path.includes('/org/')) return false;
  if (path.includes('/scan/resolve')) return false;
  if (path.includes('/scan/disambiguate')) return false;
  if (path.includes('/scan/ocr')) return false;
  if (path.includes('/auth')) return false;
  return verb === 'POST' || verb === 'PATCH' || verb === 'PUT';
}

function queueAndResolve<T>(path: string, method: string, body: string | undefined): T {
  enqueueMutation({ path, method, body });
  return { ok: true, queued: true } as T;
}

export async function mobileFetch<T>(
  path: string,
  init?: MobileFetchInit,
): Promise<T> {
  const retryOnUnauthorized = init?.retryOnUnauthorized ?? true;
  const { retryOnUnauthorized: _, queueWhenOffline: queueFlag, ...requestInit } = init ?? {};
  const method = String(requestInit.method ?? 'GET');
  const queueWhenOffline = queueFlag ?? defaultQueueWhenOffline(path, method);

  const execute = async (forceRefresh: boolean) => {
    const token = await getBearerToken(forceRefresh);
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...requestInit,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...resolveApiCompanyIdHeader(),
        ...(requestInit.headers ?? {}),
      },
    });

    if (
      response.status === 401 &&
      retryOnUnauthorized &&
      !forceRefresh &&
      useAuthStore.getState().isOnline
    ) {
      return execute(true);
    }

    const text = await response.text();
    assertJsonApiResponse(text, response.status);
    const payload = parseJsonPayload(text);

    if (!response.ok) {
      const message =
        payload?.error ?? payload?.message ?? humanizeApiErrorBody(text, response.status);
      throw new MobileApiError(message, response.status);
    }

    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new MobileApiError(humanizeApiErrorBody(text, response.status), 502);
    }
  };

  if (queueWhenOffline && !useAuthStore.getState().isOnline) {
    return queueAndResolve<T>(path, method, bodyAsString(requestInit.body));
  }

  try {
    return await execute(false);
  } catch (error) {
    if (queueWhenOffline && shouldQueueMutation(error, method)) {
      return queueAndResolve<T>(path, method, bodyAsString(requestInit.body));
    }
    throw error;
  }
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

export function mobilePatch<T>(path: string, body?: unknown): Promise<T> {
  return mobileFetch<T>(path, {
    method: 'PATCH',
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
        ...resolveApiCompanyIdHeader(),
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
        data = { error: humanizeApiErrorBody(text, response.status) } as T;
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
        ...resolveApiCompanyIdHeader(),
        ...(requestInit.headers ?? {}),
      },
    });

    if (response.status === 401 && retryOnUnauthorized && !forceRefresh) {
      return execute(true);
    }

    if (!response.ok) {
      const text = await response.text();
      const payload = parseJsonPayload(text);
      const message =
        payload?.error ?? payload?.message ?? humanizeApiErrorBody(text, response.status);
      throw new MobileApiError(message || `HTTP ${response.status}`, response.status);
    }

    return response.arrayBuffer();
  };

  return execute(false);
}

export type MobileUploadOptions = {
  onProgress?: (ratio: number) => void;
};

export async function mobileUpload<T>(
  path: string,
  formData: FormData,
  options?: MobileUploadOptions,
): Promise<T> {
  const onProgress = options?.onProgress;

  const execute = async (forceRefresh: boolean): Promise<T> => {
    const token = await getBearerToken(forceRefresh);
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...resolveApiCompanyIdHeader(),
      },
      body: formData,
    });

    if (response.status === 401 && !forceRefresh) {
      return execute(true);
    }

    const text = await response.text();
    const errorPayload = parseJsonPayload(text);

    if (!response.ok) {
      const message =
        errorPayload?.error ??
        errorPayload?.message ??
        humanizeApiErrorBody(text, response.status);
      throw new MobileApiError(message, response.status);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new MobileApiError(humanizeApiErrorBody(text, response.status), response.status);
    }
  };

  if (!onProgress) {
    return execute(false);
  }

  let ratio = 0.06;
  onProgress(ratio);
  const timer = setInterval(() => {
    ratio = Math.min(0.9, ratio + 0.05);
    onProgress(ratio);
  }, 320);

  try {
    const result = await execute(false);
    onProgress(1);
    return result;
  } finally {
    clearInterval(timer);
  }
}
