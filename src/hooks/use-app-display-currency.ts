"use client";

import { useCallback, useMemo } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import {
  AppDisplayCurrency,
  formatAppMoney,
  normalizeAppDisplayCurrency,
} from "@/lib/money/display-currency";
import {
  APP_MONEY_BASE_CURRENCY,
  convertFromBaseCurrency,
  formatExchangeRateHint,
} from "@/lib/money/exchange-rates";

export function useAppDisplayCurrency() {
  const { profile } = useAuth();
  const uid = profile?.id ?? "";
  const { preferences, savePreferences, isLoading: preferencesLoading } = useUserPreferences(uid);
  const { rates, isLoading: ratesLoading } = useExchangeRates();

  const currency = useMemo(
    () => normalizeAppDisplayCurrency(preferences.displayCurrency),
    [preferences.displayCurrency],
  );

  const convertMoney = useCallback(
    (valueInBase: number) => convertFromBaseCurrency(valueInBase, currency, rates),
    [currency, rates],
  );

  const formatMoney = useCallback(
    (valueInBase: number) => formatAppMoney(convertMoney(valueInBase), currency),
    [convertMoney, currency],
  );

  const exchangeRateHint = useMemo(
    () => formatExchangeRateHint(currency, rates),
    [currency, rates],
  );

  const setCurrency = useCallback(
    async (next: AppDisplayCurrency) => {
      await savePreferences({ displayCurrency: next });
    },
    [savePreferences],
  );

  return {
    baseCurrency: APP_MONEY_BASE_CURRENCY,
    currency,
    rates,
    convertMoney,
    formatMoney,
    exchangeRateHint,
    setCurrency,
    isLoading: preferencesLoading || ratesLoading,
  };
}
