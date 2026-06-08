import { Auth } from "firebase/auth";

import { logAppleAuthError, logAppleAuthStep } from "@/lib/auth/apple-auth-log";
import {
  clearAppleRedirectPending,
  hasPendingAppleRedirect,
} from "@/lib/auth/apple-redirect-state";
import { consumeFirebaseRedirectResult } from "@/lib/auth/sign-in-with-apple-web";

export type AppleRedirectBootstrapResult = {
  error: unknown | null;
  signedIn: boolean;
  /** True when Apple redirect finished but getRedirectResult() returned null. */
  redirectResultNull: boolean;
  hadPendingRedirect: boolean;
};

export { hasPendingAppleRedirect, markAppleRedirectPending } from "@/lib/auth/apple-redirect-state";

let redirectBootstrapPromise: Promise<AppleRedirectBootstrapResult> | null = null;

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

export async function bootstrapAppleRedirect(auth: Auth): Promise<AppleRedirectBootstrapResult> {
  if (typeof window === "undefined") {
    return { error: null, signedIn: false, redirectResultNull: false, hadPendingRedirect: false };
  }

  if (!redirectBootstrapPromise) {
    redirectBootstrapPromise = bootstrapAppleRedirectOnce(auth);
  }

  return redirectBootstrapPromise;
}

async function bootstrapAppleRedirectOnce(auth: Auth): Promise<AppleRedirectBootstrapResult> {
  const hadPendingRedirect = hasPendingAppleRedirect();

  logAppleAuthStep("redirect-bootstrap-start", {
    hadPendingRedirect,
    href: window.location.href,
    referrer: document.referrer || "(empty)",
    fromOAuth: returnedFromOAuthProvider(),
  });

  try {
    const result = await consumeFirebaseRedirectResult(auth);
    if (result?.user) {
      clearAppleRedirectPending();
      await auth.authStateReady();
      logAppleAuthStep("redirect-bootstrap-success", { uid: result.user.uid });
      return { error: null, signedIn: true, redirectResultNull: false, hadPendingRedirect };
    }
  } catch (error) {
    clearAppleRedirectPending();
    logAppleAuthError("redirect-bootstrap:getRedirectResult", error);
    return { error, signedIn: false, redirectResultNull: false, hadPendingRedirect };
  }

  await auth.authStateReady();

  if (auth.currentUser) {
    clearAppleRedirectPending();
    logAppleAuthStep("redirect-bootstrap-existing-session", { uid: auth.currentUser.uid });
    return { error: null, signedIn: false, redirectResultNull: false, hadPendingRedirect };
  }

  if (hadPendingRedirect) {
    clearAppleRedirectPending();

    if (!returnedFromOAuthProvider()) {
      logAppleAuthStep("redirect-bootstrap-stale-flag-cleared");
      return { error: null, signedIn: false, redirectResultNull: false, hadPendingRedirect: true };
    }

    console.warn("[APPLE AUTH] Redirect completed but Firebase returned null result", {
      href: window.location.href,
      referrer: document.referrer || "(empty)",
      hadPendingRedirect,
      currentUser: null,
    });

    return {
      error: null,
      signedIn: false,
      redirectResultNull: true,
      hadPendingRedirect: true,
    };
  }

  return { error: null, signedIn: false, redirectResultNull: false, hadPendingRedirect: false };
}
