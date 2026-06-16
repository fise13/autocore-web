"use client";

import type { User } from "firebase/auth";

type AuthEmailApiError = {
  error?: string;
  retryAfterSec?: number;
};

async function readAuthEmailApiError(response: Response): Promise<AuthEmailApiError | null> {
  return (await response.json().catch(() => null)) as AuthEmailApiError | null;
}

async function postAuthEmailApi(path: string, token: string | null, body?: object): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = await readAuthEmailApiError(response);
    throw new Error(payload?.error ?? "Не удалось отправить письмо");
  }
}

export async function sendVerificationEmailViaApi(user: User): Promise<void> {
  const token = await user.getIdToken();
  await postAuthEmailApi("/api/auth/send-verification-email", token);
}

export async function verifyEmailCodeViaApi(user: User, code: string): Promise<void> {
  const token = await user.getIdToken();
  await postAuthEmailApi("/api/auth/verify-email-code", token, { code });
}

export type PasswordResetDelivery = "resend" | "firebase";

export async function sendPasswordResetViaApi(email: string): Promise<PasswordResetDelivery> {
  const response = await fetch("/api/auth/send-password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });

  const payload = await readAuthEmailApiError(response);

  if (response.status === 429) {
    throw new Error(payload?.error ?? "Подождите перед повторной отправкой");
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось отправить письмо для сброса пароля");
  }

  if (payload && "fallback" in payload && payload.fallback === "firebase") {
    return "firebase";
  }

  return "resend";
}
