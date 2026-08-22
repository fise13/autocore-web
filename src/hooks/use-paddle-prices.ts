"use client";

import {
  type Paddle,
  type PricePreviewParams,
  type PricePreviewResponse,
} from "@paddle/paddle-js";
import { useEffect, useState } from "react";

import { allMarketingPriceIds } from "@/lib/paddle/marketing-plan";

export type PaddlePriceMap = Record<string, string>;

function getLineItems(): PricePreviewParams["items"] {
  return allMarketingPriceIds().map((priceId) => ({ priceId, quantity: 1 }));
}

function mapFormattedTotals(prices: PricePreviewResponse): PaddlePriceMap {
  return prices.data.details.lineItems.reduce<PaddlePriceMap>((acc, item) => {
    acc[item.price.id] = item.formattedTotals.total;
    return acc;
  }, {});
}

/**
 * @param country ISO country code from the server, or null — Paddle infers from IP when omitted.
 */
export function usePaddlePrices(
  paddle: Paddle | undefined,
  country: string | null,
): { prices: PaddlePriceMap; loading: boolean; error: string | null } {
  const [prices, setPrices] = useState<PaddlePriceMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paddle) return;

    const params: PricePreviewParams = {
      items: getLineItems(),
      ...(country ? { address: { countryCode: country } } : {}),
    };

    setLoading(true);
    setError(null);

    paddle
      .PricePreview(params)
      .then((response) => {
        setPrices(mapFormattedTotals(response));
        setLoading(false);
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Price preview failed");
        setLoading(false);
      });
  }, [country, paddle]);

  return { prices, loading, error };
}
