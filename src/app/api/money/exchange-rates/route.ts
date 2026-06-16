import { NextResponse } from "next/server";

import {
  buildExchangeRatesFromUsdPivot,
  ExchangeRates,
  FALLBACK_EXCHANGE_RATES,
} from "@/lib/money/exchange-rates";

export const runtime = "nodejs";

const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedRates: { value: ExchangeRates; expiresAt: number } | null = null;

type ErApiResponse = {
  result?: string;
  rates?: Record<string, number>;
};

async function fetchLiveRates(): Promise<ExchangeRates> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Exchange rate API failed with ${response.status}`);
  }

  const payload = (await response.json()) as ErApiResponse;
  if (payload.result !== "success" || !payload.rates) {
    throw new Error("Exchange rate API returned an invalid payload");
  }

  return buildExchangeRatesFromUsdPivot({
    kztPerUsd: payload.rates.KZT,
    rubPerUsd: payload.rates.RUB,
    source: "live",
  });
}

export async function GET() {
  if (cachedRates && Date.now() < cachedRates.expiresAt) {
    return NextResponse.json(cachedRates.value, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  }

  try {
    const rates = await fetchLiveRates();
    cachedRates = { value: rates, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json(rates, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json(FALLBACK_EXCHANGE_RATES, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
    });
  }
}
