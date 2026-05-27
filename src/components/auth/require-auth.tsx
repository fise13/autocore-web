"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { FirebaseConfigRequired } from "@/components/firebase/firebase-config-required";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { userCopy } from "@/lib/user-copy";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { logAuthDebug } from "@/lib/auth/auth-debug";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { firebaseUser, isLoading, isFirebaseReady } = useAuth();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseReady) return;
    void getFirebaseAuth()
      .authStateReady()
      .then(() => setAuthReady(true));
  }, [isFirebaseReady]);

  const currentUser = authReady ? getFirebaseAuth().currentUser : null;
  const isAuthed = Boolean(firebaseUser ?? currentUser);

  useEffect(() => {
    if (!isFirebaseReady || isLoading || !authReady) return;
    if (!isAuthed) {
      logAuthDebug("require-auth", "not authed → redirect /login", {
        firebaseUser: firebaseUser?.uid ?? null,
        currentUser: currentUser?.uid ?? null,
        isLoading,
      });
      router.replace("/login");
    } else {
      logAuthDebug("require-auth", "authed ok", {
        firebaseUser: firebaseUser?.uid ?? null,
        currentUser: currentUser?.uid ?? null,
      });
    }
  }, [
    authReady,
    currentUser?.uid,
    firebaseUser?.uid,
    isAuthed,
    isFirebaseReady,
    isLoading,
    router,
  ]);

  if (!isFirebaseReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <FirebaseConfigRequired />
      </div>
    );
  }

  if (isLoading || !authReady || !isAuthed) {
    return <AppLoadingScreen message={userCopy.auth.completing} />;
  }

  return <>{children}</>;
}
