"use client";

import { useCallback, useMemo } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useCompanyAppConfig } from "@/hooks/use-company-app-config";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { createCompanyConfigRepository } from "@/infrastructure/firestore/company-config-repository";
import {
  AppDisplayCurrency,
  formatAppMoney,
  formatAppMoneyExample,
  normalizeAppDisplayCurrency,
} from "@/lib/money/display-currency";
import {
  APP_MONEY_BASE_CURRENCY,
  convertFromBaseCurrency,
  convertToBaseCurrency,
  formatExchangeRateHint,
} from "@/lib/money/exchange-rates";

const companyConfigRepository = createCompanyConfigRepository();

export function useAppDisplayCurrency() {
  const { profile } = useAuth();
  const companyId = profile?.companyId?.trim() ?? "";
  const { config, loaded: configLoaded } = useCompanyAppConfig(companyId || null);
  const { rates, isLoading: ratesLoading } = useExchangeRates();

  const currency = useMemo(
    () => normalizeAppDisplayCurrency(config?.displayCurrency),
    [config?.displayCurrency],
  );

  const convertMoney = useCallback(
    (valueInBase: number) => convertFromBaseCurrency(valueInBase, currency, rates),
    [currency, rates],
  );

  const formatMoney = useCallback(
    (valueInBase: number) => formatAppMoney(convertMoney(valueInBase), currency),
    [convertMoney, currency],
  );

  const toBaseAmount = useCallback(
    (displayAmount: number) => convertToBaseCurrency(displayAmount, currency, rates),
    [currency, rates],
  );

  const formatExample = useCallback(
    (amountInBase: number, target: AppDisplayCurrency = currency) =>
      formatAppMoneyExample(amountInBase, target, (value) =>
        convertFromBaseCurrency(value, target, rates),
      ),
    [currency, rates],
  );

  const exchangeRateHint = useMemo(
    () => formatExchangeRateHint(currency, rates),
    [currency, rates],
  );

  const setCurrency = useCallback(
    async (next: AppDisplayCurrency) => {
      if (!companyId || !profile?.id) {
        throw new Error("Company is not selected");
      }
      await companyConfigRepository.saveCompanyDisplayCurrency(
        companyId,
        normalizeAppDisplayCurrency(next),
        profile.id,
      );
    },
    [companyId, profile?.id],
  );

  return {
    baseCurrency: APP_MONEY_BASE_CURRENCY,
    currency,
    rates,
    convertMoney,
    toBaseAmount,
    formatMoney,
    formatExample,
    exchangeRateHint,
    setCurrency,
    isLoading: (!configLoaded && Boolean(companyId)) || ratesLoading,
  };
}
