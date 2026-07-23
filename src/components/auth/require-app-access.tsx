"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useSyncExternalStore } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { DashboardShellSkeleton } from "@/components/layout/dashboard-shell-skeleton";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { canAccessPath, defaultAppPath } from "@/lib/auth/app-access";
import { hasSeenAuthSession } from "@/lib/performance/session-flags";
import { userCopy } from "@/lib/user-copy";

type RequireAppAccessProps = {
  children: ReactNode;
};

function useReturningAuthSession(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => hasSeenAuthSession(),
    () => false,
  );
}

export function RequireAppAccess({ children }: RequireAppAccessProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, isLoading } = useAuth();
  const returningSession = useReturningAuthSession();

  const allowed = profile ? canAccessPath(profile, pathname) : false;
  const fallbackPath = profile ? defaultAppPath(profile) : "/";

  useEffect(() => {
    if (isLoading || !profile) return;
    if (!canAccessPath(profile, pathname)) {
      router.replace(fallbackPath);
    }
  }, [fallbackPath, isLoading, pathname, profile, router]);

  if (isLoading && !profile) {
    return returningSession ? (
      <DashboardShellSkeleton />
    ) : (
      <AppLoadingScreen message={userCopy.auth.loading} />
    );
  }

  if (!profile) {
    return returningSession ? (
      <DashboardShellSkeleton />
    ) : (
      <AppLoadingScreen message={userCopy.auth.loading} />
    );
  }

  if (!allowed) {
    return <DashboardShellSkeleton />;
  }

  return <>{children}</>;
}
