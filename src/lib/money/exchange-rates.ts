import { AppDisplayCurrency } from "@/lib/money/display-currency";

/** Amounts in Firestore and operations are stored in KZT. */
export const APP_MONEY_BASE_CURRENCY = "KZT" as const;

export type ExchangeRates = {
  base: typeof APP_MONEY_BASE_CURRENCY;
  /** How many KZT equal 1 USD. */
  kztPerUsd: number;
  /** How many RUB equal 1 USD. */
  rubPerUsd: number;
  fetchedAt: string;
  source: "live" | "fallback";
};

export const FALLBACK_EXCHANGE_RATES: ExchangeRates = {
  base: "KZT",
  kztPerUsd: 450,
  rubPerUsd: 92,
  fetchedAt: new Date(0).toISOString(),
  source: "fallback",
};

function assertPositiveRate(value: unknown, field: string): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`Invalid exchange rate for ${field}`);
  }
  return numeric;
}

export function buildExchangeRatesFromUsdPivot(input: {
  kztPerUsd: unknown;
  rubPerUsd: unknown;
  fetchedAt?: string;
  source?: ExchangeRates["source"];
}): ExchangeRates {
  return {
    base: "KZT",
    kztPerUsd: assertPositiveRate(input.kztPerUsd, "KZT"),
    rubPerUsd: assertPositiveRate(input.rubPerUsd, "RUB"),
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    source: input.source ?? "live",
  };
}

export function convertFromBaseCurrency(
  amountInKzt: number,
  target: AppDisplayCurrency,
  rates: ExchangeRates = FALLBACK_EXCHANGE_RATES,
): number {
  if (!Number.isFinite(amountInKzt)) return 0;
  if (target === "KZT") return amountInKzt;
  if (target === "USD") return amountInKzt / rates.kztPerUsd;
  return amountInKzt * (rates.rubPerUsd / rates.kztPerUsd);
}

export function formatExchangeRateHint(currency: AppDisplayCurrency, rates: ExchangeRates): string | null {
  if (currency === "KZT") return null;
  if (currency === "USD") {
    return `1 USD ≈ ${Math.round(rates.kztPerUsd).toLocaleString("ru-RU")} ₸`;
  }
  const kztPerRub = rates.kztPerUsd / rates.rubPerUsd;
  return `1 ₽ ≈ ${kztPerRub.toFixed(2).replace(".", ",")} ₸`;
}
