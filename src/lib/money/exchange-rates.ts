import { AppDisplayCurrency } from "@/lib/money/display-currency";

/**
 * Amounts in Firestore and operations are stored in USD.
 * Display currency converts from that base using the live (or fallback) KZT rate.
 */
export const APP_MONEY_BASE_CURRENCY = "USD" as const;

/** Offline / first-paint rate until `/api/money/exchange-rates` responds. */
export const FALLBACK_KZT_PER_USD = 470;

export type ExchangeRates = {
  base: typeof APP_MONEY_BASE_CURRENCY;
  kztPerUsd: number;
  rubPerUsd: number;
  fetchedAt: string;
  source: "live" | "fallback";
};

export const FALLBACK_EXCHANGE_RATES: ExchangeRates = {
  base: "USD",
  kztPerUsd: FALLBACK_KZT_PER_USD,
  rubPerUsd: 1,
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
  kztPerUsd?: unknown;
  rubPerUsd?: unknown;
  fetchedAt?: string;
  source?: ExchangeRates["source"];
}): ExchangeRates {
  return {
    base: "USD",
    kztPerUsd: input.kztPerUsd != null ? assertPositiveRate(input.kztPerUsd, "KZT") : FALLBACK_KZT_PER_USD,
    rubPerUsd: input.rubPerUsd != null ? assertPositiveRate(input.rubPerUsd, "RUB") : 1,
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    source: input.source ?? "live",
  };
}

export function convertFromBaseCurrency(
  amountInUsd: number,
  target: AppDisplayCurrency = "USD",
  rates: ExchangeRates = FALLBACK_EXCHANGE_RATES,
): number {
  if (!Number.isFinite(amountInUsd)) return 0;
  if (target === "KZT") return amountInUsd * rates.kztPerUsd;
  return amountInUsd;
}

/** Inverse of `convertFromBaseCurrency` — used when the user types an amount. */
export function convertToBaseCurrency(
  amount: number,
  source: AppDisplayCurrency = "USD",
  rates: ExchangeRates = FALLBACK_EXCHANGE_RATES,
): number {
  if (!Number.isFinite(amount)) return 0;
  if (source === "KZT") {
    const rate = rates.kztPerUsd;
    if (!Number.isFinite(rate) || rate <= 0) return 0;
    return amount / rate;
  }
  return amount;
}

export function formatExchangeRateHint(
  currency: AppDisplayCurrency,
  rates: ExchangeRates,
): string | null {
  if (currency !== "KZT") return null;
  const rate = rates.kztPerUsd;
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const formatted = new Intl.NumberFormat("kk-KZ", { maximumFractionDigits: 0 }).format(Math.round(rate));
  return `1 USD = ${formatted} ₸`;
}
