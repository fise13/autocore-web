import { create } from 'zustand';

import {
  appDisplayCurrencyAffix,
  formatAppMoney,
  normalizeAppDisplayCurrency,
  type AppDisplayCurrency,
} from '@/lib/money/display-currency';
import { readCachedDisplayCurrency } from '@/lib/money/display-currency-cache';
import {
  convertFromBaseCurrency,
  FALLBACK_EXCHANGE_RATES,
  type ExchangeRates,
} from '@/lib/money/exchange-rates';

type MoneyFormatState = {
  currency: AppDisplayCurrency;
  rates: ExchangeRates;
  currencyPrefix: string;
  currencySuffix: string;
  formatMoney: (value: number) => string;
  convertMoney: (value: number) => number;
  setMoneyFormat: (payload: { currency: AppDisplayCurrency; rates: ExchangeRates }) => void;
};

function buildFormatters(currency: AppDisplayCurrency, rates: ExchangeRates) {
  const affix = appDisplayCurrencyAffix(currency);
  const convertMoney = (value: number) => convertFromBaseCurrency(value, currency, rates);
  const formatMoney = (value: number) => formatAppMoney(convertMoney(value), currency);
  return { ...affix, convertMoney, formatMoney };
}

const seededCurrency = readCachedDisplayCurrency();
const defaults = buildFormatters(seededCurrency, FALLBACK_EXCHANGE_RATES);

export const useMoneyFormatStore = create<MoneyFormatState>((set) => ({
  currency: seededCurrency,
  rates: FALLBACK_EXCHANGE_RATES,
  currencyPrefix: defaults.prefix,
  currencySuffix: defaults.suffix,
  formatMoney: defaults.formatMoney,
  convertMoney: defaults.convertMoney,
  setMoneyFormat: ({ currency, rates }) => {
    const normalized = normalizeAppDisplayCurrency(currency);
    const formatters = buildFormatters(normalized, rates);
    set({
      currency: normalized,
      rates,
      currencyPrefix: formatters.prefix,
      currencySuffix: formatters.suffix,
      formatMoney: formatters.formatMoney,
      convertMoney: formatters.convertMoney,
    });
  },
}));

export function formatPrice(value: number): string {
  return useMoneyFormatStore.getState().formatMoney(value);
}

export function convertPrice(value: number): number {
  return useMoneyFormatStore.getState().convertMoney(value);
}

/** Subscribe so a screen re-renders the instant currency or the live rate changes. */
export function useMoneyFormatRevision(): string {
  return useMoneyFormatStore(
    (state) => `${state.currency}:${state.rates.kztPerUsd}:${state.rates.fetchedAt}`,
  );
}
