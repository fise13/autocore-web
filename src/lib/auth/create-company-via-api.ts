"use client";

import type { User } from "firebase/auth";

export async function createCompanyViaApi(user: User, name: string): Promise<string> {
  const token = await user.getIdToken();
  const response = await fetch("/api/onboarding/create-company", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: name.trim() }),
  });

  const payload = (await response.json().catch(() => null)) as {
    companyId?: string;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось создать компанию");
  }

  const companyId = payload?.companyId?.trim();
  if (!companyId) {
    throw new Error("Сервер не вернул идентификатор компании");
  }

  return companyId;
}
