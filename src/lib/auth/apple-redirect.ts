import { Auth } from "firebase/auth";

import { clearAppleJsSession } from "@/lib/auth/apple-js-sign-in";
import { getAppleWebSetupHint } from "@/lib/auth/apple-web-setup";
import { consumeFirebaseRedirectResult } from "@/lib/auth/sign-in-with-apple-web";
import { logAuthDebug } from "@/lib/auth/auth-debug";
import { mapAuthError, userCopy } from "@/lib/user-copy";

export const APPLE_REDIRECT_FLAG = "autocore.appleRedirect";

let redirectBootstrapPromise: Promise<string | null> | null = null;

function clearFirebaseAppleRedirectFlag() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(APPLE_REDIRECT_FLAG);
}

export function hasPendingAppleRedirect(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(APPLE_REDIRECT_FLAG) === "1";
}

export function markAppleRedirectPending() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(APPLE_REDIRECT_FLAG, "1");
}

function returnedFromOAuthProvider(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ref = document.referrer;
    return (
      ref.includes("firebaseapp.com") ||
      ref.includes("appleid.apple.com") ||
      window.location.hash.includes("apiKey=") ||
      window.location.search.includes("apiKey=")
    );
  } catch {
    return false;
  }
}

export async function bootstrapAppleRedirect(auth: Auth): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!redirectBootstrapPromise) {
    redirectBootstrapPromise = bootstrapAppleRedirectOnce(auth);
  }

  return redirectBootstrapPromise;
}

async function bootstrapAppleRedirectOnce(auth: Auth): Promise<string | null> {
  const hadAppleRedirect = hasPendingAppleRedirect();
  clearAppleJsSession();

  logAuthDebug("redirect", "bootstrap", {
    hadAppleRedirect,
    href: window.location.href,
    referrer: document.referrer || "(empty)",
    fromOAuth: returnedFromOAuthProvider(),
  });

  const result = await consumeFirebaseRedirectResult(auth);

  if (result?.user) {
    clearFirebaseAppleRedirectFlag();
    await auth.authStateReady();
    return null;
  }

  await auth.authStateReady();

  if (auth.currentUser) {
    clearFirebaseAppleRedirectFlag();
    return null;
  }

  if (hadAppleRedirect) {
    clearFirebaseAppleRedirectFlag();

    if (!returnedFromOAuthProvider()) {
      logAuthDebug("redirect", "stale redirect flag cleared");
      return null;
    }

    logAuthDebug("redirect", "OAuth return but no Firebase user");
    return [
      userCopy.onboarding.appleFailed,
      mapAuthError(new Error("auth/invalid-credential"), { provider: "apple" }),
      getAppleWebSetupHint(),
      "Если popup блокируется — разрешите всплывающие окна для localhost или попробуйте Chrome.",
    ].join("\n\n");
  }

  return null;
}
