"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useSyncExternalStore } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { DashboardShellSkeleton } from "@/components/layout/dashboard-shell-skeleton";
import { FirebaseConfigRequired } from "@/components/firebase/firebase-config-required";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { userCopy } from "@/lib/user-copy";
import { logAuthDebug } from "@/lib/auth/auth-debug";
import { hasSeenAuthSession, markAuthSessionSeen } from "@/lib/performance/session-flags";

type RequireAuthProps = {
  children: ReactNode;
};

function useReturningAuthSession(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => hasSeenAuthSession(),
    () => false,
  );
}

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { firebaseUser, isLoading, isFirebaseReady } = useAuth();
  const returningSession = useReturningAuthSession();

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

  useEffect(() => {
    if (firebaseUser) {
      markAuthSessionSeen();
    }
  }, [firebaseUser]);

  if (!isFirebaseReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <FirebaseConfigRequired />
      </div>
    );
  }

  if (isLoading) {
    return returningSession ? <DashboardShellSkeleton /> : <AppLoadingScreen message={userCopy.auth.completing} />;
  }

  if (!firebaseUser) {
    return returningSession ? <DashboardShellSkeleton /> : <AppLoadingScreen message={userCopy.auth.completing} />;
  }

  return <>{children}</>;
}
