"use client";

import { useLayoutEffect, useMemo, useState } from "react";

import { AppLoadingLogo } from "@/components/brand/app-loading-logo";
import {
  type AppLocale,
  coerceAppLocale,
  PREFERRED_LOCALE_STORAGE_KEY,
  readStoredPreferredLocale,
  resolveAccountLocale,
} from "@/lib/locale/preferred-locale";
import { setActiveUserCopyLocale, userCopy } from "@/lib/user-copy";

type AppLoadingScreenProps = {
  compact?: boolean;
  message?: string;
  /** Prefer when known from server cookie / `?lang=` so SSR matches EN. */
  locale?: AppLocale;
};

function readCookieLocale(): AppLocale | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${PREFERRED_LOCALE_STORAGE_KEY}=`));
    if (!match) return null;
    return coerceAppLocale(decodeURIComponent(match.split("=").slice(1).join("=")));
  } catch {
    return null;
  }
}

export function AppLoadingScreen({
  compact = false,
  message,
  locale: localeProp,
}: AppLoadingScreenProps) {
  const [bootLocale, setBootLocale] = useState<AppLocale | null>(() =>
    resolveAccountLocale({ queryLocale: localeProp, storedLocale: localeProp }),
  );

  useLayoutEffect(() => {
    const resolved = resolveAccountLocale({
      queryLocale:
        localeProp ??
        (typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("lang")
          : null),
      storedLocale: localeProp ?? readStoredPreferredLocale() ?? readCookieLocale(),
    });
    setActiveUserCopyLocale(resolved);
    setBootLocale(resolved);
  }, [localeProp]);

  const resolvedMessage = useMemo(() => {
    if (bootLocale) setActiveUserCopyLocale(bootLocale);
    return message ?? userCopy.auth.loading;
  }, [bootLocale, message]);

  return (
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center gap-3 py-16"
          : "flex min-h-screen flex-col items-center justify-center gap-5 bg-background"
      }
      role="status"
      aria-live="polite"
      aria-label={resolvedMessage}
      suppressHydrationWarning
    >
      <AppLoadingLogo size={compact ? 56 : 80} />
      <div className="flex flex-col items-center gap-1.5 animate-autocore-fade-in-up motion-reduce:animate-none">
        <p className="text-sm font-medium tracking-tight text-foreground">{userCopy.appName}</p>
        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
          {resolvedMessage}
        </p>
      </div>
    </div>
  );
}
