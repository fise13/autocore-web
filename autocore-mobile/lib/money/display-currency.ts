export const APP_DISPLAY_CURRENCIES = ['USD', 'KZT'] as const;

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
  {
    id: 'KZT',
    label: 'Tenge',
    description: 'Kazakhstan · ₸',
    locale: 'kk-KZ',
    currency: 'KZT',
    example: '450 000 ₸',
  },
];

export function normalizeAppDisplayCurrency(value?: unknown): AppDisplayCurrency {
  if (value === 'KZT') return 'KZT';
  return 'USD';
}

export function appDisplayCurrencyOption(currency: AppDisplayCurrency): AppDisplayCurrencyOption {
  return APP_DISPLAY_CURRENCY_OPTIONS.find((item) => item.id === currency) ?? APP_DISPLAY_CURRENCY_OPTIONS[0];
}

export function appDisplayCurrencyAffix(currency?: AppDisplayCurrency): { prefix: string; suffix: string } {
  if (normalizeAppDisplayCurrency(currency) === 'KZT') {
    return { prefix: '', suffix: ' ₸' };
  }
  return { prefix: '$', suffix: '' };
}

export function formatAppMoney(value: number, currency: AppDisplayCurrency = 'USD'): string {
  const option = appDisplayCurrencyOption(currency);
  const safe = Number.isFinite(value) ? value : 0;
  const fractionDigits = option.currency === 'KZT' ? 0 : Math.abs(safe) < 1000 ? 2 : 0;
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
