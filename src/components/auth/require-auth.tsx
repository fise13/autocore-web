"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useSyncExternalStore } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { DashboardShellSkeleton } from "@/components/layout/dashboard-shell-skeleton";
import { FirebaseConfigRequired } from "@/components/firebase/firebase-config-required";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { userCopy } from "@/lib/user-copy";
import { logAuthDebug } from "@/lib/auth/auth-debug";
import { buildLoginUrl } from "@/lib/auth/return-to";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { firebaseUser, isLoading, isFirebaseReady } = useAuth();
  const returningSession = useReturningAuthSession();

  useEffect(() => {
    if (!isFirebaseReady || isLoading) return;
    if (!firebaseUser) {
      // Carry the destination through login, so a deep link opened signed out
      // (or opened on the web because the app is not installed) still lands on
      // the page that was asked for.
      const query = searchParams.toString();
      const destination = `${pathname ?? "/"}${query ? `?${query}` : ""}`;
      const loginUrl = buildLoginUrl(destination);
      logAuthDebug("require-auth", `not authed → redirect ${loginUrl}`, {
        firebaseUser: null,
        isLoading,
      });
      router.replace(loginUrl);
    }
  }, [firebaseUser, isFirebaseReady, isLoading, pathname, router, searchParams]);

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
