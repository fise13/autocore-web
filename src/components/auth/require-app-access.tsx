"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { canAccessPath, defaultAppPath } from "@/lib/auth/app-access";

type RequireAppAccessProps = {
  children: ReactNode;
};

export function RequireAppAccess({ children }: RequireAppAccessProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, isLoading } = useAuth();

  const allowed = profile ? canAccessPath(profile, pathname) : false;
  const fallbackPath = profile ? defaultAppPath(profile) : "/";

  useEffect(() => {
    if (isLoading || !profile) return;
    if (!canAccessPath(profile, pathname)) {
      router.replace(fallbackPath);
    }
  }, [fallbackPath, isLoading, pathname, profile, router]);

  if (isLoading || !profile) {
    return <AppLoadingScreen message="Загрузка…" />;
  }

  if (!allowed) {
    return <AppLoadingScreen message="Загрузка…" />;
  }

  return <>{children}</>;
}
