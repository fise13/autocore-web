import { create } from 'zustand';

import {
  appDisplayCurrencyAffix,
  formatAppMoney,
  normalizeAppDisplayCurrency,
  type AppDisplayCurrency,
} from '@/lib/money/display-currency';
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
  formatMoney: (valueInKzt: number) => string;
  convertMoney: (valueInKzt: number) => number;
  setMoneyFormat: (payload: { currency: AppDisplayCurrency; rates: ExchangeRates }) => void;
};

function buildFormatters(currency: AppDisplayCurrency, rates: ExchangeRates) {
  const affix = appDisplayCurrencyAffix(currency);
  const convertMoney = (valueInKzt: number) => convertFromBaseCurrency(valueInKzt, currency, rates);
  const formatMoney = (valueInKzt: number) => formatAppMoney(convertMoney(valueInKzt), currency);
  return { ...affix, convertMoney, formatMoney };
}

const defaults = buildFormatters('KZT', FALLBACK_EXCHANGE_RATES);

export const useMoneyFormatStore = create<MoneyFormatState>((set) => ({
  currency: 'KZT',
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

export function formatPrice(valueInKzt: number): string {
  return useMoneyFormatStore.getState().formatMoney(valueInKzt);
}

export function convertPrice(valueInKzt: number): number {
  return useMoneyFormatStore.getState().convertMoney(valueInKzt);
}
