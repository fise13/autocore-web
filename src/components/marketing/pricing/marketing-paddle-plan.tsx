"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";

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
  yearlySaveLabel?: string;
  buyVariant?: "default" | "outline";
  secondaryAction?: ReactNode;
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
  yearlySaveLabel,
  buyVariant = "default",
  secondaryAction,
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
    <div className={cn("marketing-paddle-plan", className)}>
      {showIntervalToggle ? (
        <div className="marketing-paddle-toggle" role="group" aria-label={intervalAriaLabel}>
          {(["month", "year"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={cn("marketing-paddle-toggle-btn", frequency === value && "is-active")}
              onClick={() => setFrequency(value)}
            >
              <span>{value === "month" ? monthlyLabel : yearlyLabel}</span>
              {value === "year" && yearlySaveLabel ? (
                <span className="marketing-paddle-save">{yearlySaveLabel}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="marketing-paddle-price">
        <span className={cn("exp-display tracking-tight", priceClassName ?? "text-6xl sm:text-7xl")}>
          {displayPrice}
        </span>
        <span className="marketing-paddle-period">{periodLabel}</span>
      </div>
      <p className="marketing-paddle-note">{note}</p>

      <div className="marketing-paddle-actions">
        <Button
          size="lg"
          variant={buyVariant}
          className="h-10 min-w-[11rem] px-5 text-sm"
          disabled={!configured || !ready || checkoutPending}
          onClick={subscribeToPlan}
        >
          {buyLabel}
        </Button>
        {secondaryAction}
      </div>

      {previewError ? (
        <p className="marketing-paddle-error" role="alert">
          {previewError}
        </p>
      ) : null}

      <p className="sr-only">{MARKETING_PLAN.description}</p>
    </div>
  );
}
