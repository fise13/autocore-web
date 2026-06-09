import {
  Auth,
  OAuthProvider,
  UserCredential,
  browserLocalPersistence,
  getAdditionalUserInfo,
  getRedirectResult,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
} from "firebase/auth";

import { logAppleAuthError, logAppleAuthStep } from "@/lib/auth/apple-auth-log";
import { buildInitialsAvatarDataUrl } from "@/lib/auth/apple-profile-avatar";
import { markAppleRedirectPending } from "@/lib/auth/apple-redirect-state";
import { createAppleOAuthProvider } from "@/lib/auth/apple-provider";
import { logAuthDebug } from "@/lib/auth/auth-debug";

function getAuthErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: string }).code);
  }
  if (error instanceof Error && error.message.startsWith("auth/")) {
    return error.message;
  }
  return "";
}

function prefersRedirectFlow(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
}

function shouldRetryWithRedirect(error: unknown): boolean {
  const code = getAuthErrorCode(error);
  return (
    code === "auth/popup-blocked" ||
    code === "auth/cancelled-popup-request" ||
    code === "auth/operation-not-supported-in-this-environment"
  );
}

function readAppleDisplayName(result: UserCredential): string | null {
  if (result.user.displayName?.trim()) {
    return result.user.displayName.trim();
  }

  const additional = getAdditionalUserInfo(result);
  const profile = additional?.profile as
    | { name?: { firstName?: string; lastName?: string } | string }
    | undefined;

  if (!profile?.name) return null;

  const name = profile.name;
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  if (typeof name === "object") {
    const parts = [name.firstName, name.lastName].filter(
      (part): part is string => typeof part === "string" && part.trim().length > 0,
    );
    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return null;
}

async function ensureAuthPersistence(auth: Auth): Promise<void> {
  await setPersistence(auth, browserLocalPersistence);
}

/** Applies Apple OAuth tokens and persists display name from the first sign-in. */
export async function applyAppleSignInResult(result: UserCredential): Promise<UserCredential> {
  const credential = OAuthProvider.credentialFromResult(result);
  logAppleAuthStep("firebase-credential-from-result", {
    hasAccessToken: Boolean(credential?.accessToken),
    hasIdToken: Boolean(credential?.idToken),
    uid: result.user.uid,
    email: result.user.email,
  });
  logAuthDebug("apple-web", "credentialFromResult", {
    hasAccessToken: Boolean(credential?.accessToken),
    hasIdToken: Boolean(credential?.idToken),
    uid: result.user.uid,
    email: result.user.email,
  });

  const displayName = readAppleDisplayName(result);
  const profileUpdate: { displayName?: string; photoURL?: string } = {};

  if (displayName && !result.user.displayName?.trim()) {
    profileUpdate.displayName = displayName;
  }

  if (!result.user.photoURL?.trim()) {
    profileUpdate.photoURL = buildInitialsAvatarDataUrl(
      displayName ?? result.user.displayName,
      result.user.email ?? "",
    );
  }

  if (Object.keys(profileUpdate).length > 0) {
    await updateProfile(result.user, profileUpdate);
    logAppleAuthStep("profile-saved", profileUpdate);
  }

  return result;
}

/**
 * Firebase Apple sign-in via OAuthProvider.
 * Desktop: signInWithPopup. Mobile / blocked popup: signInWithRedirect.
 * Returns null when redirect was started (page will navigate away).
 */
export async function signInWithAppleFirebase(auth: Auth): Promise<UserCredential | null> {
  logAppleAuthStep("sign-in-start", {
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "(missing)",
    preferRedirect: prefersRedirectFlow(),
  });

  await ensureAuthPersistence(auth);
  const provider = createAppleOAuthProvider();

  if (prefersRedirectFlow()) {
    logAppleAuthStep("redirect-start");
    markAppleRedirectPending();
    await signInWithRedirect(auth, provider);
    return null;
  }

  try {
    logAppleAuthStep("popup-start");
    const result = await signInWithPopup(auth, provider);
    logAppleAuthStep("popup-success", { uid: result.user.uid });
    return applyAppleSignInResult(result);
  } catch (error) {
    logAppleAuthError("popup", error);

    if (shouldRetryWithRedirect(error)) {
      logAppleAuthStep("popup-fallback-to-redirect", { code: getAuthErrorCode(error) });
      markAppleRedirectPending();
      await signInWithRedirect(auth, provider);
      return null;
    }

    throw error;
  }
}

/** @deprecated Use signInWithAppleFirebase */
export const signInWithAppleWeb = signInWithAppleFirebase;

export function getAuthErrorCodeForDisplay(error: unknown): string {
  return getAuthErrorCode(error);
}

let redirectResultPromise: Promise<UserCredential | null> | null = null;

/** Must run once per page load after signInWithRedirect (Firebase SDK). */
export function consumeFirebaseRedirectResult(auth: Auth): Promise<UserCredential | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (!redirectResultPromise) {
    redirectResultPromise = (async () => {
      logAppleAuthStep("redirect-return:getRedirectResult-start");
      await ensureAuthPersistence(auth);
      const result = await getRedirectResult(auth);

      if (!result?.user) {
        console.warn("[APPLE AUTH] Redirect completed but Firebase returned null result", {
          result,
          currentUser: auth.currentUser?.uid ?? null,
        });
        logAppleAuthStep("redirect-return:null-result", {
          hasResult: Boolean(result),
          currentUser: auth.currentUser?.uid ?? null,
        });
        return null;
      }

      logAppleAuthStep("redirect-return:success", { uid: result.user.uid });
      return applyAppleSignInResult(result);
    })();
  }

  return redirectResultPromise;
}
