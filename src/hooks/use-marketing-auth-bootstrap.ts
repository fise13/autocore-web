"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { isFirebaseHandlerAppleAuthMode } from "@/lib/auth/apple-auth-mode";
import { formatAppleAuthErrorForUi, logAppleAuthError } from "@/lib/auth/apple-auth-log";
import { bootstrapAppleRedirect } from "@/lib/auth/apple-redirect";
import { prepareAppleSignInSession } from "@/lib/auth/apple-js-sign-in";
import { prepareSyncAuth } from "@/lib/auth/prepare-sync-auth";
import { navigateToAppAfterAuth } from "@/lib/motion/auth-session-transition";

/** Completes Firebase Apple redirect OAuth on marketing pages (firebase_handler mode only). */
export function useMarketingAuthBootstrap() {
  const router = useRouter();
  const { isFirebaseReady, refreshProfile } = useAuth();
  const [appleBootstrapError, setAppleBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseReady) return;

    if (!isFirebaseHandlerAppleAuthMode()) {
      void prepareAppleSignInSession().catch((error) => {
        logAppleAuthError("marketing-auth-bootstrap:prepare-apple-session", error);
      });
      return;
    }

    let cancelled = false;
    const auth = getFirebaseAuth();

    void (async () => {
      const { error, signedIn, redirectResultNull } = await bootstrapAppleRedirect(auth);
      if (cancelled) return;

      if (error) {
        logAppleAuthError("marketing-auth-bootstrap", error);
        setAppleBootstrapError(formatAppleAuthErrorForUi(error));
        return;
      }

      if (redirectResultNull) {
        setAppleBootstrapError("Redirect completed but Firebase returned null result");
        return;
      }

      if (!signedIn) return;

      const user = auth.currentUser;
      if (!user) return;

      try {
        await prepareSyncAuth(user.uid, { force: true });
        await refreshProfile();
        await navigateToAppAfterAuth(router, "replace");
      } catch (syncError) {
        logAppleAuthError("marketing-auth-bootstrap:post-sign-in", syncError);
        await navigateToAppAfterAuth(router, "replace");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isFirebaseReady, refreshProfile, router]);

  return { appleBootstrapError };
}
