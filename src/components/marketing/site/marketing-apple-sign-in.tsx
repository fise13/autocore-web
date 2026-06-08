"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppleIcon } from "@/components/auth/auth-brand-icons";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { logAuthDebug } from "@/lib/auth/auth-debug";
import { formatAppleAuthErrorForUi, logAppleAuthError } from "@/lib/auth/apple-auth-log";
import { isAppleUserCancellationError, normalizeAppleJsError } from "@/lib/auth/apple-js-sign-in";
import { prepareSyncAuth } from "@/lib/auth/prepare-sync-auth";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type MarketingAppleSignInProps = {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost";
  showLabel?: boolean;
  onNavigate?: () => void;
};

export function MarketingAppleSignIn({
  className,
  size = "sm",
  variant = "outline",
  showLabel = true,
  onNavigate,
}: MarketingAppleSignInProps) {
  const router = useRouter();
  const { signInWithApple, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    logAuthDebug("marketing-apple", "sign-in start");
    setIsLoading(true);
    setError(null);
    onNavigate?.();

    try {
      await signInWithApple();
      const auth = getFirebaseAuth();
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user) {
        // Firebase redirect flow — keep loading until navigation completes.
        return;
      }

      await prepareSyncAuth(user.uid, { force: true });
      await refreshProfile();
      router.push("/");
    } catch (cause) {
      logAuthDebug("marketing-apple", "sign-in error", cause);
      if (isAppleUserCancellationError(cause)) {
        setIsLoading(false);
        return;
      }
      logAppleAuthError("marketing-apple-sign-in", cause);
      setError(formatAppleAuthErrorForUi(normalizeAppleJsError(cause)));
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(!showLabel && "px-2.5")}
        disabled={isLoading}
        onClick={() => void handleSignIn()}
        aria-label={showLabel ? undefined : userCopy.auth.signInApple}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" data-icon={showLabel ? "inline-start" : undefined} aria-hidden />
        ) : (
          <AppleIcon className="size-4" data-icon={showLabel ? "inline-start" : undefined} />
        )}
        {showLabel ? userCopy.auth.signInApple : null}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
