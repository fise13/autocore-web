"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthDebugPanel } from "@/components/auth/auth-debug-panel";
import { LoginScreen } from "@/components/auth/login-screen";
import { FirebaseConfigRequired } from "@/components/firebase/firebase-config-required";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import {
  buildAuthDebugSnapshot,
  isAuthDebugEnabled,
  logAuthDebug,
  snapshotAuthDebug,
} from "@/lib/auth/auth-debug";
import { formatAppleAuthErrorForUi, logAppleAuthError } from "@/lib/auth/apple-auth-log";
import { isFirebaseHandlerAppleAuthMode } from "@/lib/auth/apple-auth-mode";
import { bootstrapAppleRedirect } from "@/lib/auth/apple-redirect";
import { prepareAppleSignInSession, isAppleJsReturnLanding } from "@/lib/auth/apple-js-sign-in";
import { completeAppleJsReturnIfNeeded } from "@/lib/auth/sign-in-with-apple-credential";
import { navigateToAppAfterAuth } from "@/lib/motion/auth-session-transition";
import { userCopy } from "@/lib/user-copy";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckSource = searchParams.get("source") === "deck";
  const { firebaseUser, profile, isLoading, isFirebaseReady, refreshProfile } = useAuth();
  const [authReady, setAuthReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [appleReturnPending, setAppleReturnPending] = useState(
    () => typeof window !== "undefined" && isAppleJsReturnLanding(),
  );

  const goToApp = useCallback(() => {
    if (deckSource) {
      router.replace("/deck/callback");
      return;
    }
    void navigateToAppAfterAuth(router, "replace");
  }, [deckSource, router]);

  useEffect(() => {
    logAuthDebug("login-page", "mounted");
  }, []);

  useEffect(() => {
    if (!isFirebaseReady) return;
    if (isFirebaseHandlerAppleAuthMode()) return;

    void prepareAppleSignInSession().catch((error) => {
      logAppleAuthError("login-page:prepare-apple-session", error);
    });
  }, [isFirebaseReady]);

  useEffect(() => {
    if (!isFirebaseReady || isFirebaseHandlerAppleAuthMode()) return;

    let cancelled = false;
    const auth = getFirebaseAuth();

    void (async () => {
      try {
        const result = await completeAppleJsReturnIfNeeded(auth);
        if (cancelled) return;
        if (!result) {
          setAppleReturnPending(false);
          return;
        }
        await auth.authStateReady();
        await refreshProfile();
        if (!cancelled && auth.currentUser) {
          logAuthDebug("login-page", "apple-js redirect complete → /");
          setAppleReturnPending(false);
          await navigateToAppAfterAuth(router, "replace");
        }
      } catch (error) {
        if (!cancelled) {
          setAppleReturnPending(false);
          logAppleAuthError("login-page:apple-js-return", error);
          setBootstrapError(formatAppleAuthErrorForUi(error));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isFirebaseReady, refreshProfile, router]);

  useEffect(() => {
    if (!isFirebaseReady) return;
    if (!isFirebaseHandlerAppleAuthMode()) {
      setAuthReady(true);
      return;
    }

    let cancelled = false;
    const auth = getFirebaseAuth();

    void (async () => {
      const { error: redirectError, redirectResultNull } = await bootstrapAppleRedirect(auth);
      if (!cancelled && redirectError) {
        logAppleAuthError("login-page:bootstrap", redirectError);
        setBootstrapError(formatAppleAuthErrorForUi(redirectError));
      } else if (!cancelled && redirectResultNull) {
        setBootstrapError("Redirect completed but Firebase returned null result");
      }
      await auth.authStateReady();
      if (!cancelled) {
        logAuthDebug("login-page", "authStateReady");
        setAuthReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isFirebaseReady]);

  const currentUser = authReady ? getFirebaseAuth().currentUser : null;
  const isAuthed = Boolean(firebaseUser ?? currentUser);

  useEffect(() => {
    snapshotAuthDebug(
      buildAuthDebugSnapshot({
        firebaseUserUid: firebaseUser?.uid ?? null,
        currentUserUid: currentUser?.uid ?? null,
        isLoading,
        authReady,
        isAuthed,
        profileCompanyId: profile?.companyId ?? null,
      }),
    );
  }, [authReady, currentUser?.uid, firebaseUser?.uid, isAuthed, isLoading, profile?.companyId]);

  useEffect(() => {
    if (!isFirebaseReady || isLoading || !authReady) return;
    if (!isAuthed) return;

    logAuthDebug("login-page", deckSource ? "redirect → /deck/callback" : "redirect → /", {
      firebaseUser: firebaseUser?.uid ?? null,
      currentUser: currentUser?.uid ?? null,
    });

    if (deckSource) {
      router.replace("/deck/callback");
    } else {
      void navigateToAppAfterAuth(router, "replace");
    }

    const fallbackTimer = window.setTimeout(() => {
      if (window.location.pathname.startsWith("/login")) {
        window.location.assign(deckSource ? "/deck/callback" : "/");
      }
    }, 4000);

    return () => window.clearTimeout(fallbackTimer);
  }, [authReady, currentUser?.uid, deckSource, firebaseUser?.uid, isAuthed, isFirebaseReady, isLoading, router]);

  const debugSnapshot = buildAuthDebugSnapshot({
    firebaseUserUid: firebaseUser?.uid ?? null,
    currentUserUid: currentUser?.uid ?? null,
    isLoading,
    authReady,
    isAuthed,
    profileCompanyId: profile?.companyId ?? null,
  });

  const showAuthDebug = isAuthDebugEnabled();

  if (appleReturnPending) {
    return (
      <>
        <AppLoadingScreen message="Завершаем вход через Apple…" />
        {showAuthDebug ? <AuthDebugPanel snapshot={debugSnapshot} /> : null}
      </>
    );
  }

  if (!isFirebaseReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <FirebaseConfigRequired />
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <AppLoadingScreen message={userCopy.auth.completing} />
        {showAuthDebug ? <AuthDebugPanel snapshot={debugSnapshot} /> : null}
      </>
    );
  }

  if (isAuthed) {
    return (
      <>
        <AppLoadingScreen message={userCopy.auth.completing} />
        {showAuthDebug ? <AuthDebugPanel snapshot={debugSnapshot} /> : null}
      </>
    );
  }

  return (
    <div>
      <Suspense fallback={<AppLoadingScreen message={userCopy.auth.loading} />}>
        <LoginScreen bootstrapError={bootstrapError} onAuthenticated={goToApp} />
      </Suspense>
      {showAuthDebug ? <AuthDebugPanel snapshot={debugSnapshot} /> : null}
    </div>
  );
}
