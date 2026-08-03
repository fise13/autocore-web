import { AppDisplayCurrency } from "@/lib/money/display-currency";

/**
 * Amounts in Firestore and operations are stored in USD.
 * Display is USD-only — exchange helpers are identity no-ops kept for call-site compatibility.
 */
export const APP_MONEY_BASE_CURRENCY = "USD" as const;

export type ExchangeRates = {
  base: typeof APP_MONEY_BASE_CURRENCY;
  /** Retained for API payload compatibility; unused for display. */
  kztPerUsd: number;
  rubPerUsd: number;
  fetchedAt: string;
  source: "live" | "fallback";
};

export const FALLBACK_EXCHANGE_RATES: ExchangeRates = {
  base: "USD",
  kztPerUsd: 1,
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
    kztPerUsd: input.kztPerUsd != null ? assertPositiveRate(input.kztPerUsd, "KZT") : 1,
    rubPerUsd: input.rubPerUsd != null ? assertPositiveRate(input.rubPerUsd, "RUB") : 1,
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    source: input.source ?? "live",
  };
}

export function convertFromBaseCurrency(
  amountInUsd: number,
  _target: AppDisplayCurrency = "USD",
  _rates: ExchangeRates = FALLBACK_EXCHANGE_RATES,
): number {
  if (!Number.isFinite(amountInUsd)) return 0;
  return amountInUsd;
}

export function formatExchangeRateHint(
  _currency: AppDisplayCurrency,
  _rates: ExchangeRates,
): string | null {
  return null;
}
