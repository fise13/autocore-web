"use client";

import { useCallback, useMemo, useState } from "react";

import { usePaddleCheckout } from "@/components/billing/paddle-provider";
import { usePaddleCountry } from "@/components/marketing/paddle-country-provider";
import { Button } from "@/components/ui/button";
import { usePaddlePrices } from "@/hooks/use-paddle-prices";
import { usePaddleSubscribe } from "@/hooks/use-paddle-subscribe";
import {
  MARKETING_PLAN,
  marketingPriceIdForFrequency,
  type MarketingBillingFrequency,
} from "@/lib/paddle/marketing-plan";
import { cn } from "@/lib/utils";

type MarketingPaddlePlanProps = {
  country?: string | null;
  fallbackPrice: string;
  fallbackPeriod: string;
  fallbackYearlyPrice: string;
  fallbackYearlyPeriod: string;
  monthlyLabel: string;
  yearlyLabel: string;
  intervalAriaLabel: string;
  note: string;
  buyLabel: string;
  className?: string;
  priceClassName?: string;
  showIntervalToggle?: boolean;
};

export function MarketingPaddlePlan({
  country: countryProp,
  fallbackPrice,
  fallbackPeriod,
  fallbackYearlyPrice,
  fallbackYearlyPeriod,
  monthlyLabel,
  yearlyLabel,
  intervalAriaLabel,
  note,
  buyLabel,
  className,
  priceClassName,
  showIntervalToggle = true,
}: MarketingPaddlePlanProps) {
  const countryFromContext = usePaddleCountry();
  const country = countryProp ?? countryFromContext;
  const { paddle, ready, configured } = usePaddleCheckout();
  const { subscribe } = usePaddleSubscribe();
  const [frequency, setFrequency] = useState<MarketingBillingFrequency>("month");
  const [checkoutPending, setCheckoutPending] = useState(false);

  const { prices, loading, error: previewError } = usePaddlePrices(paddle ?? undefined, country);

  const activePriceId = marketingPriceIdForFrequency(frequency);
  const formattedPrice = prices[activePriceId];
  const fallbackActivePrice = frequency === "year" ? fallbackYearlyPrice : fallbackPrice;
  const periodLabel = frequency === "year" ? fallbackYearlyPeriod : fallbackPeriod;

  const displayPrice = useMemo(() => {
    if (loading || !formattedPrice) return fallbackActivePrice;
    return formattedPrice;
  }, [fallbackActivePrice, formattedPrice, loading]);

  const subscribeToPlan = useCallback(() => {
    setCheckoutPending(true);
    void subscribe({
      interval: frequency === "year" ? "yearly" : "monthly",
    }).finally(() => setCheckoutPending(false));
  }, [frequency, subscribe]);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {showIntervalToggle ? (
        <div
          className="mb-4 inline-flex rounded-full border border-border/60 bg-muted/40 p-1 text-sm"
          role="group"
          aria-label={intervalAriaLabel}
        >
          {(["month", "year"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={cn(
                "rounded-full px-4 py-1.5 transition-colors",
                frequency === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setFrequency(value)}
            >
              {value === "month" ? monthlyLabel : yearlyLabel}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-baseline justify-center gap-2">
        <span className={cn("exp-display tracking-tight", priceClassName ?? "text-6xl sm:text-7xl")}>
          {displayPrice}
        </span>
        <span className="text-lg text-muted-foreground sm:text-xl">{periodLabel}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>

      <Button
        size="lg"
        variant="outline"
        className="mt-8 h-10 min-w-[11rem] px-5 text-sm"
        disabled={!configured || !ready || checkoutPending}
        onClick={subscribeToPlan}
      >
        {buyLabel}
      </Button>

      {previewError ? (
        <p className="mt-3 max-w-sm text-center text-xs text-destructive" role="alert">
          {previewError}
        </p>
      ) : null}

      <p className="sr-only">{MARKETING_PLAN.description}</p>
    </div>
  );
}
