export const APP_DISPLAY_CURRENCIES = ["KZT", "RUB", "USD"] as const;

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
    id: "KZT",
    label: "Тенге",
    description: "Казахстан · ₸",
    locale: "ru-KZ",
    currency: "KZT",
    example: "100 000 ₸",
  },
  {
    id: "RUB",
    label: "Рубли",
    description: "Россия · ₽",
    locale: "ru-RU",
    currency: "RUB",
    example: "100 000 ₽",
  },
  {
    id: "USD",
    label: "Доллары",
    description: "Международные расчёты · $",
    locale: "en-US",
    currency: "USD",
    example: "$1,000",
  },
];

export function normalizeAppDisplayCurrency(value: unknown): AppDisplayCurrency {
  if (value === "RUB" || value === "USD" || value === "KZT") return value;
  return "KZT";
}

export function appDisplayCurrencyOption(currency: AppDisplayCurrency): AppDisplayCurrencyOption {
  return APP_DISPLAY_CURRENCY_OPTIONS.find((item) => item.id === currency) ?? APP_DISPLAY_CURRENCY_OPTIONS[0];
}

export function formatAppMoney(value: number, currency: AppDisplayCurrency = "KZT"): string {
  const option = appDisplayCurrencyOption(currency);
  const fractionDigits = currency === "USD" && Math.abs(value) < 1000 ? 2 : 0;
  return new Intl.NumberFormat(option.locale, {
    style: "currency",
    currency: option.currency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatAppMoneyExample(
  amountInBase: number,
  currency: AppDisplayCurrency,
  convert: (value: number) => number,
): string {
  return formatAppMoney(convert(amountInBase), currency);
}

/** Marketing site always uses USD. */
export function formatMarketingUsd(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
  }).format(rounded);
}
