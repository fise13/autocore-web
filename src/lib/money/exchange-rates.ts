import { AppDisplayCurrency } from "@/lib/money/display-currency";

/**
 * Amounts in Firestore and operations are stored in USD (US market).
 *
 * The rate-fetch API (`/api/money/exchange-rates`, backed by
 * open.er-api.com/v6/latest/USD) is inherently USD-pivot already — `kztPerUsd`
 * and `rubPerUsd` mean "how many KZT/RUB equal 1 USD" regardless of which
 * currency the *app* treats as its base, so switching the base only changes
 * `convertFromBaseCurrency`'s direction, not the rate values themselves.
 *
 * Was `"KZT"`; financial-operation records have no per-record currency field
 * (`src/domain/financial-operation.ts`), so whatever a user types into an
 * amount field is implicitly denominated in this base currency — KZT amounts
 * entered by existing companies are unaffected (still summed/read as before),
 * but a new company's amounts are now correctly read as USD instead of
 * silently being divided by ~450 when displayed.
 */
export const APP_MONEY_BASE_CURRENCY = "USD" as const;

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
  base: "USD",
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
    base: "USD",
    kztPerUsd: assertPositiveRate(input.kztPerUsd, "KZT"),
    rubPerUsd: assertPositiveRate(input.rubPerUsd, "RUB"),
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    source: input.source ?? "live",
  };
}

export function convertFromBaseCurrency(
  amountInUsd: number,
  target: AppDisplayCurrency,
  rates: ExchangeRates = FALLBACK_EXCHANGE_RATES,
): number {
  if (!Number.isFinite(amountInUsd)) return 0;
  if (target === "USD") return amountInUsd;
  if (target === "KZT") return amountInUsd * rates.kztPerUsd;
  return amountInUsd * rates.rubPerUsd;
}

export function formatExchangeRateHint(currency: AppDisplayCurrency, rates: ExchangeRates): string | null {
  if (currency === "USD") return null;
  if (currency === "KZT") {
    return `1 USD ≈ ${Math.round(rates.kztPerUsd).toLocaleString("en-US")} ₸`;
  }
  return `1 USD ≈ ${Math.round(rates.rubPerUsd).toLocaleString("en-US")} ₽`;
}
