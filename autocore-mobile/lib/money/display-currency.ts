export const APP_DISPLAY_CURRENCIES = ['USD'] as const;

export type AppDisplayCurrency = (typeof APP_DISPLAY_CURRENCIES)[number];

export type AppDisplayCurrencyOption = {
  id: AppDisplayCurrency;
  label: string;
  description: string;
  locale: string;
  currency: string;
  example: string;
};

export const APP_DISPLAY_CURRENCY_OPTIONS: AppDisplayCurrencyOption[] = [
  {
    id: 'USD',
    label: 'Dollars',
    description: 'United States · $',
    locale: 'en-US',
    currency: 'USD',
    example: '$1,000',
  },
];

/** Always USD — legacy KZT/RUB preference values are coerced. */
export function normalizeAppDisplayCurrency(_value?: unknown): AppDisplayCurrency {
  return 'USD';
}

export function appDisplayCurrencyOption(currency: AppDisplayCurrency): AppDisplayCurrencyOption {
  return APP_DISPLAY_CURRENCY_OPTIONS.find((item) => item.id === currency) ?? APP_DISPLAY_CURRENCY_OPTIONS[0];
}

export function appDisplayCurrencyAffix(_currency?: AppDisplayCurrency): { prefix: string; suffix: string } {
  return { prefix: '$', suffix: '' };
}

export function formatAppMoney(value: number, _currency: AppDisplayCurrency = 'USD'): string {
  const option = appDisplayCurrencyOption('USD');
  const safe = Number.isFinite(value) ? value : 0;
  const fractionDigits = Math.abs(safe) < 1000 ? 2 : 0;
  return new Intl.NumberFormat(option.locale, {
    style: 'currency',
    currency: option.currency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(safe);
}

export function formatAppMoneyExample(
  amountInBase: number,
  currency: AppDisplayCurrency,
  convert: (value: number) => number,
): string {
  return formatAppMoney(convert(amountInBase), currency);
}
