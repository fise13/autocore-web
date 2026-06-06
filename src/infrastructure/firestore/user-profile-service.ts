import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { prepareLogoFile } from "@/lib/company/prepare-logo-file";

const PROFILE_REQUEST_TIMEOUT_MS = 25_000;

async function authorizedFetch(path: string, init: RequestInit): Promise<Response> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Требуется авторизация");
  }

  const token = await user.getIdToken();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PROFILE_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(path, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Запрос занял слишком много времени. Попробуйте ещё раз.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function updateAccountProfile(payload: {
  name?: string | null;
  phone?: string | null;
}): Promise<void> {
  const response = await authorizedFetch("/api/account/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
    }),
  });

  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(body?.error ?? "Не удалось сохранить профиль");
  }
}

export async function uploadUserAvatar(file: File): Promise<string> {
  const prepared = await prepareLogoFile(file);
  const formData = new FormData();
  formData.append("file", prepared);

  const response = await authorizedFetch("/api/account/avatar", {
    method: "POST",
    body: formData,
  });

  const body = (await response.json().catch(() => null)) as { photoURL?: string; error?: string } | null;
  if (!response.ok) {
    throw new Error(body?.error ?? "Не удалось загрузить аватар");
  }
  if (!body?.photoURL) {
    throw new Error("Сервер не вернул ссылку на аватар");
  }

  return body.photoURL;
}
