import {
  Auth,
  OAuthProvider,
  User,
  signInWithCredential,
  updateProfile,
} from "firebase/auth";

import { AppleJsUser, clearAppleJsSession, signInWithAppleJs } from "@/lib/auth/apple-js-sign-in";
import { logAuthDebug } from "@/lib/auth/auth-debug";
import { mapAuthError } from "@/lib/user-copy";

function buildDisplayName(user?: AppleJsUser): string | null {
  const firstName = user?.name?.firstName?.trim();
  const lastName = user?.name?.lastName?.trim();
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return displayName || null;
}

async function applyAppleDisplayName(user: User, appleUser?: AppleJsUser) {
  const displayName = buildDisplayName(appleUser);
  if (!displayName || user.displayName?.trim()) {
    return;
  }

  await updateProfile(user, { displayName });
}

export async function completeAppleCredentialSignIn(
  auth: Auth,
  idToken: string,
  rawNonce: string,
  appleUser?: AppleJsUser,
) {
  logAuthDebug("apple-credential", "completeAppleCredentialSignIn (macOS parity)", {
    idTokenLength: idToken.trim().length,
    rawNonceLength: rawNonce.trim().length,
  });

  const trimmedNonce = rawNonce.trim();
  if (!idToken.trim()) {
    throw new Error("Не удалось получить безопасный токен Apple ID. Повторите попытку.");
  }
  if (!trimmedNonce) {
    throw new Error("Не удалось подготовить безопасный вход через Apple. Попробуйте ещё раз.");
  }

  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({
    idToken,
    rawNonce: trimmedNonce,
  });

  const result = await signInWithCredential(auth, credential);
  logAuthDebug("apple-credential", "signInWithCredential success", {
    uid: result.user.uid,
    email: result.user.email,
  });
  await applyAppleDisplayName(result.user, appleUser);
  clearAppleJsSession();
  return result;
}

export async function signInWithAppleLikeMacOS(auth: Auth) {
  logAuthDebug("apple-credential", "signInWithAppleLikeMacOS start");
  try {
    const appleResult = await signInWithAppleJs();
    logAuthDebug("apple-credential", "Apple returned id_token", {
      hasUser: Boolean(appleResult.user),
      idTokenLength: appleResult.authorization.id_token.length,
    });
    return completeAppleCredentialSignIn(
      auth,
      appleResult.authorization.id_token,
      appleResult.rawNonce,
      appleResult.user,
    );
  } catch (error) {
    clearAppleJsSession();
    logAuthDebug("apple-credential", "signInWithAppleLikeMacOS error", error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "";

    if (code.startsWith("auth/") || error instanceof Error) {
      throw error;
    }

    throw new Error(mapAuthError(error, { provider: "apple" }));
  }
}
