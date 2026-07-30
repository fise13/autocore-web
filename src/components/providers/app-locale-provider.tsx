"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { isDemoSession } from "@/lib/demo/demo-config";
import {
  type AppLocale,
  coerceAppLocale,
  readStoredPreferredLocale,
  resolveAccountLocale,
  storePreferredLocale,
  UI_LOCALE_LOCK,
} from "@/lib/locale/preferred-locale";
import { setActiveUserCopyLocale } from "@/lib/user-copy";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { doc, setDoc } from "firebase/firestore";

type AppLocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => Promise<void>;
  isSaving: boolean;
};

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);

export function AppLocaleProvider({ children }: { children: ReactNode }) {
  const { profile, firebaseUser, refreshProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [overrideLocale, setOverrideLocale] = useState<AppLocale | null>(null);

  const locale = useMemo(() => {
    if (UI_LOCALE_LOCK) return UI_LOCALE_LOCK;
    if (overrideLocale) return overrideLocale;
    return resolveAccountLocale({
      profileLocale: profile?.preferredLocale,
      storedLocale: readStoredPreferredLocale(),
    });
  }, [overrideLocale, profile?.preferredLocale]);

  useEffect(() => {
    if (UI_LOCALE_LOCK) return;
    if (typeof window === "undefined") return;
    const lang = new URLSearchParams(window.location.search).get("lang");
    if (!lang) return;
    const normalized = coerceAppLocale(lang);
    setOverrideLocale(normalized);
    storePreferredLocale(normalized);
  }, []);

  useEffect(() => {
    setActiveUserCopyLocale(locale);
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
    storePreferredLocale(locale);
  }, [locale]);

  const setLocale = useCallback(
    async (next: AppLocale) => {
      // While locked, the switcher is inert rather than writing a preference
      // that would take effect the moment the lock is lifted.
      if (UI_LOCALE_LOCK) return;

      const normalized = coerceAppLocale(next);
      setOverrideLocale(normalized);
      storePreferredLocale(normalized);
      setActiveUserCopyLocale(normalized);

      if (!firebaseUser || isDemoSession({ email: firebaseUser.email })) {
        return;
      }

      setIsSaving(true);
      try {
        const db = getFirestoreDb();
        await setDoc(
          doc(db, "users", firebaseUser.uid),
          { preferredLocale: normalized },
          { merge: true },
        );
        await refreshProfile();
      } finally {
        setIsSaving(false);
      }
    },
    [firebaseUser, refreshProfile],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      isSaving,
    }),
    [isSaving, locale, setLocale],
  );

  return (
    <AppLocaleContext.Provider value={value}>
      <div key={locale} className="contents">
        {children}
      </div>
    </AppLocaleContext.Provider>
  );
}

export function useAppLocale(): AppLocaleContextValue {
  const ctx = useContext(AppLocaleContext);
  if (!ctx) {
    throw new Error("useAppLocale must be used within AppLocaleProvider");
  }
  return ctx;
}

export function useAppLocaleOptional(): AppLocaleContextValue | null {
  return useContext(AppLocaleContext);
}
