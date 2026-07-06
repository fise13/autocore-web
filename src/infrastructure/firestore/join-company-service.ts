import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { mapAuthError } from "@/lib/user-copy";

type InviteApiErrorPayload = {
  error?: string;
  code?: string;
};

async function postInviteApi(path: string, body: unknown): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("auth/invalid-credential");
  }

  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as InviteApiErrorPayload;
  if (!response.ok) {
    const message = payload.error?.trim() || "Не удалось присоединиться к компании";
    const error = new Error(message) as Error & { code?: string };
    if (payload.code) error.code = payload.code;
    throw error;
  }
}

/** Join via invite code through server API (notifications + activity log). */
export async function joinCompanyWithInviteCode(_uid: string, rawCode: string): Promise<void> {
  try {
    await postInviteApi("/api/invites/accept-code", {
      code: rawCode,
      switchToCompany: true,
    });
  } catch (error) {
    throw new Error(mapAuthError(error, { surface: "onboarding" }));
  }
}

/** Join via invite token through server API. */
export async function joinCompanyWithInviteToken(_uid: string, rawToken: string): Promise<void> {
  const token = rawToken.trim();
  if (!token) {
    throw new Error("Некорректная ссылка приглашения");
  }

  try {
    await postInviteApi("/api/invites/accept", {
      token,
      switchToCompany: true,
    });
  } catch (error) {
    throw new Error(mapAuthError(error, { surface: "onboarding" }));
  }
}
