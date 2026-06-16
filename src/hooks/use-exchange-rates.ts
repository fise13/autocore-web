"use client";

import { useEffect, useState } from "react";

import { ExchangeRates, FALLBACK_EXCHANGE_RATES } from "@/lib/money/exchange-rates";

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_EXCHANGE_RATES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/money/exchange-rates", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ExchangeRates | null) => {
        if (cancelled || !payload?.kztPerUsd || !payload?.rubPerUsd) return;
        setRates(payload);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { rates, isLoading };
}
