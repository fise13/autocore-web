"use client";

import { useCallback, useMemo } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import {
  AppDisplayCurrency,
  formatAppMoney,
  normalizeAppDisplayCurrency,
} from "@/lib/money/display-currency";

export function useAppDisplayCurrency() {
  const { profile } = useAuth();
  const uid = profile?.id ?? "";
  const { preferences, savePreferences, isLoading } = useUserPreferences(uid);

  const currency = useMemo(
    () => normalizeAppDisplayCurrency(preferences.displayCurrency),
    [preferences.displayCurrency],
  );

  const formatMoney = useCallback((value: number) => formatAppMoney(value, currency), [currency]);

  const setCurrency = useCallback(
    async (next: AppDisplayCurrency) => {
      await savePreferences({ displayCurrency: next });
    },
    [savePreferences],
  );

  return {
    currency,
    formatMoney,
    setCurrency,
    isLoading,
  };
}
