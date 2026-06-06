"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { FirebaseConfigRequired } from "@/components/firebase/firebase-config-required";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { userCopy } from "@/lib/user-copy";
import { logAuthDebug } from "@/lib/auth/auth-debug";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { firebaseUser, isLoading, isFirebaseReady } = useAuth();

  useEffect(() => {
    if (!isFirebaseReady || isLoading) return;
    if (!firebaseUser) {
      logAuthDebug("require-auth", "not authed → redirect /login", {
        firebaseUser: null,
        isLoading,
      });
      router.replace("/login");
    }
  }, [firebaseUser, isFirebaseReady, isLoading, router]);

  if (!isFirebaseReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <FirebaseConfigRequired />
      </div>
    );
  }

  if (isLoading) {
    return <AppLoadingScreen message={userCopy.auth.completing} />;
  }

  if (!firebaseUser) {
    return <AppLoadingScreen message={userCopy.auth.completing} />;
  }

  return <>{children}</>;
}
