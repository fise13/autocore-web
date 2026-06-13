"use client";

import type { User } from "firebase/auth";

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
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
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

export async function sendPasswordResetViaApi(email: string): Promise<void> {
  await postAuthEmailApi("/api/auth/send-password-reset", null, { email: email.trim() });
}
