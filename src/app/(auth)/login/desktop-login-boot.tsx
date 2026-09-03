"use client";

import { type ReactNode } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { userCopy } from "@/lib/user-copy";

/**
 * Desktop WKWebView always sends `AutoCoreDesktop/` in the user agent, so the
 * login layout can SSR this gate instead of the public sign-in form. Without
 * it a signed-in launch paints "Sign in" for a frame while Firebase hydrates.
 */
export function DesktopLoginBoot({ children }: { children: ReactNode }) {
  const { firebaseUser, isLoading, isFirebaseReady } = useAuth();

  if (!isFirebaseReady || isLoading) {
    return <AppLoadingScreen message={userCopy.auth.loading} />;
  }

  if (firebaseUser) {
    return <AppLoadingScreen message={userCopy.auth.completing} />;
  }

  return <>{children}</>;
}
