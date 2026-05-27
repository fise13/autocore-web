import {
  Auth,
  UserCredential,
  browserLocalPersistence,
  getRedirectResult,
  setPersistence,
  signInWithPopup,
} from "firebase/auth";

import { createAppleOAuthProvider } from "@/lib/auth/apple-provider";
import { logAuthDebug } from "@/lib/auth/auth-debug";

export class AppleRedirectStarted extends Error {
  constructor() {
    super("APPLE_REDIRECT_STARTED");
    this.name = "AppleRedirectStarted";
  }
}

function getAuthErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: string }).code);
  }
  if (error instanceof Error && error.message.startsWith("auth/")) {
    return error.message;
  }
  return "";
}

/**
 * Firebase Apple OAuth via popup only.
 * Redirect on localhost often loses OAuth state (getRedirectResult = null).
 */
export async function signInWithAppleWeb(auth: Auth): Promise<UserCredential> {
  logAuthDebug("apple-web", "Firebase OAuth popup", {
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "(missing)",
  });

  await setPersistence(auth, browserLocalPersistence);
  const provider = createAppleOAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    logAuthDebug("apple-web", "popup success", {
      uid: result.user.uid,
      email: result.user.email,
    });
    return result;
  } catch (error) {
    logAuthDebug("apple-web", "popup error", error);
    throw error;
  }
}

export function getAuthErrorCodeForDisplay(error: unknown): string {
  return getAuthErrorCode(error);
}

let redirectResultPromise: Promise<UserCredential | null> | null = null;

/** Must run once per page load, as early as possible. */
export function consumeFirebaseRedirectResult(auth: Auth): Promise<UserCredential | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (!redirectResultPromise) {
    redirectResultPromise = (async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await getRedirectResult(auth);
        logAuthDebug("redirect", "consumeFirebaseRedirectResult", {
          hasUser: Boolean(result?.user),
          uid: result?.user?.uid ?? null,
        });
        return result;
      } catch (error) {
        logAuthDebug("redirect", "consumeFirebaseRedirectResult error", error);
        return null;
      }
    })();
  }

  return redirectResultPromise;
}
