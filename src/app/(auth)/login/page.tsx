"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
import { bootstrapAppleRedirect } from "@/lib/auth/apple-redirect";
import { userCopy } from "@/lib/user-copy";

export default function LoginPage() {
  const router = useRouter();
  const { firebaseUser, profile, isLoading, isFirebaseReady } = useAuth();
  const [authReady, setAuthReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    logAuthDebug("login-page", "mounted");
  }, []);

  useEffect(() => {
    if (!isFirebaseReady) return;

    let cancelled = false;
    const auth = getFirebaseAuth();

    void (async () => {
      const redirectError = await bootstrapAppleRedirect(auth);
      if (!cancelled && redirectError) {
        setBootstrapError(redirectError);
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
    if (isAuthed) {
      logAuthDebug("login-page", "redirect → /", {
        firebaseUser: firebaseUser?.uid ?? null,
        currentUser: currentUser?.uid ?? null,
      });
      router.replace("/");
    }
  }, [authReady, currentUser?.uid, firebaseUser?.uid, isAuthed, isFirebaseReady, isLoading, router]);

  const debugSnapshot = buildAuthDebugSnapshot({
    firebaseUserUid: firebaseUser?.uid ?? null,
    currentUserUid: currentUser?.uid ?? null,
    isLoading,
    authReady,
    isAuthed,
    profileCompanyId: profile?.companyId ?? null,
  });

  const showAuthDebug = isAuthDebugEnabled();

  if (!isFirebaseReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <FirebaseConfigRequired />
      </div>
    );
  }

  if (!authReady || isLoading || isAuthed) {
    return (
      <>
        <AppLoadingScreen message={userCopy.auth.completing} />
        {showAuthDebug ? <AuthDebugPanel snapshot={debugSnapshot} /> : null}
      </>
    );
  }

  return (
    <div>
      <LoginScreen bootstrapError={bootstrapError} />
      {showAuthDebug ? <AuthDebugPanel snapshot={debugSnapshot} /> : null}
    </div>
  );
}
