import "server-only";

import { getAdminAuth } from "@/infrastructure/firebase/admin";

const MOBILE_BUNDLE_ID = "com.wise.autocore.mobile";
const APPLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_APPLE_WEB_CLIENT_ID?.trim() || "com.wise.autocore.web";

export type MobileAppleSignInInput = {
  idToken: string;
  rawNonce: string;
  authorizationCode?: string | null;
  email?: string | null;
  fullName?: string | null;
};

type IdentityToolkitSignInResponse = {
  localId?: string;
  idToken?: string;
  refreshToken?: string;
  error?: { message?: string; code?: number };
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function firebaseApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured");
  }
  return apiKey;
}

function firebaseAuthHandlerUri(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
  }
  return `https://${projectId}.firebaseapp.com/__/auth/handler`;
}

async function signInWithAppleIdp(
  idToken: string,
  rawNonce: string,
  requestUri: string,
): Promise<IdentityToolkitSignInResponse> {
  const postBody = [
    `id_token=${encodeURIComponent(idToken)}`,
    `nonce=${encodeURIComponent(rawNonce)}`,
    "providerId=apple.com",
  ].join("&");

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${firebaseApiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody,
        requestUri,
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    },
  );

  const payload = (await response.json()) as IdentityToolkitSignInResponse;
  if (!response.ok || !payload.localId) {
    const message = payload.error?.message ?? `signInWithIdp failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function requestUrisForToken(idToken: string): string[] {
  const aud = String(decodeJwtPayload(idToken)?.aud ?? "").trim();
  const uris = new Set<string>();

  if (aud === MOBILE_BUNDLE_ID) {
    uris.add(`https://${MOBILE_BUNDLE_ID}`);
  }
  if (aud === APPLE_WEB_CLIENT_ID) {
    uris.add(firebaseAuthHandlerUri());
  }

  uris.add(`https://${MOBILE_BUNDLE_ID}`);
  uris.add(firebaseAuthHandlerUri());

  return [...uris];
}

export async function completeMobileAppleSignIn(
  input: MobileAppleSignInInput,
): Promise<{ customToken: string }> {
  const idToken = input.idToken.trim();
  const rawNonce = input.rawNonce.trim();

  if (!idToken) {
    throw new Error("Apple identity token is missing");
  }
  if (!rawNonce) {
    throw new Error("Apple nonce is missing");
  }

  let lastError: unknown = null;
  for (const requestUri of requestUrisForToken(idToken)) {
    try {
      const result = await signInWithAppleIdp(idToken, rawNonce, requestUri);
      const uid = result.localId;
      if (!uid) {
        throw new Error("Firebase did not return a user id");
      }

      const profileUpdate: { displayName?: string; email?: string } = {};
      const fullName = input.fullName?.trim();
      const email = input.email?.trim();
      if (fullName) profileUpdate.displayName = fullName;
      if (email) profileUpdate.email = email;

      if (Object.keys(profileUpdate).length > 0) {
        try {
          await getAdminAuth().updateUser(uid, profileUpdate);
        } catch (error) {
          console.warn("[mobile/auth/apple] profile update skipped:", error);
        }
      }

      const customToken = await getAdminAuth().createCustomToken(uid);
      return { customToken };
    } catch (error) {
      lastError = error;
      console.warn("[mobile/auth/apple] signInWithIdp failed", { requestUri, error });
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Не удалось подтвердить вход через Apple");
}
