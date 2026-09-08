"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";

import { usePaddleCheckout } from "@/components/billing/paddle-provider";
import { FrequencyToggle, type FREQUENCY } from "@/components/frequency-toggle";
import { PricingCard, PricingSection } from "@/components/pricing-section";
import { Button } from "@/components/ui/button";
import { usePaddlePrices } from "@/hooks/use-paddle-prices";
import { usePaddleSubscribe } from "@/hooks/use-paddle-subscribe";
import {
  MARKETING_PLAN,
  marketingPriceIdForFrequency,
  type MarketingBillingFrequency,
} from "@/lib/paddle/marketing-plan";

const FALLBACK_MONTHLY = 40;
const FALLBACK_YEARLY = 400;

function parseAmount(formatted: string | undefined, fallback: number): number {
  if (!formatted) return fallback;
  const match = formatted.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match?.[1]) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function toPaddleFrequency(frequency: FREQUENCY): MarketingBillingFrequency {
  return frequency === "yearly" ? "year" : "month";
}

export type MarketingPricingBlockCopy = {
  title: ReactNode;
  titleId: string;
  titleAs?: "h1" | "h2";
  description: string;
  planName: string;
  planInfo: string;
  features: readonly string[];
  monthlyLabel: string;
  yearlyLabel: string;
  intervalAria: string;
  billedMonthly: string;
  billedYearly: string;
  monthlySuffix: string;
  yearlySuffix: string;
  yearlySave: string;
  buyLabel: string;
  footnote?: string;
};

type MarketingPricingBlockProps = {
  copy: MarketingPricingBlockCopy;
  secondaryAction: ReactNode;
  layoutId?: string;
};

export function MarketingPricingBlock({
  copy,
  secondaryAction,
  layoutId = "marketing-frequency",
}: MarketingPricingBlockProps) {
  const { paddle, ready, configured } = usePaddleCheckout();
  const { subscribe } = usePaddleSubscribe();
  const { prices, error: previewError } = usePaddlePrices(paddle ?? undefined, null);
  const [frequency, setFrequency] = useState<FREQUENCY>("monthly");
  const [checkoutPending, setCheckoutPending] = useState(false);

  const paddleFrequency = toPaddleFrequency(frequency);
  const formatted = prices[marketingPriceIdForFrequency(paddleFrequency)];
  const price = useMemo(
    () =>
      parseAmount(formatted, frequency === "yearly" ? FALLBACK_YEARLY : FALLBACK_MONTHLY),
    [formatted, frequency],
  );

  const subscribeToPlan = useCallback(() => {
    setCheckoutPending(true);
    void subscribe({
      interval: frequency === "yearly" ? "yearly" : "monthly",
    }).finally(() => setCheckoutPending(false));
  }, [frequency, subscribe]);

  return (
    <PricingSection
      title={copy.title}
      titleId={copy.titleId}
      titleAs={copy.titleAs}
      description={copy.description}
      toggle={
        <FrequencyToggle
          frequency={frequency}
          setFrequency={setFrequency}
          layoutId={layoutId}
          aria-label={copy.intervalAria}
          labels={{
            monthly: copy.monthlyLabel,
            yearly: copy.yearlyLabel,
          }}
        />
      }
    >
      <PricingCard
        className="mkt-pricing-card bg-surface-elevated border-foreground/25 shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]"
        frequency={frequency}
        plan={{
          name: copy.planName,
          info: copy.planInfo,
          highlighted: true,
          features: copy.features,
          billedLabel: frequency === "yearly" ? copy.billedYearly : copy.billedMonthly,
          saveLabel: copy.yearlySave,
          price,
          suffix: frequency === "yearly" ? copy.yearlySuffix : copy.monthlySuffix,
        }}
        footer={
          <>
            <Button
              className="h-10 w-full"
              size="lg"
              disabled={!configured || !ready || checkoutPending}
              onClick={subscribeToPlan}
            >
              {copy.buyLabel}
            </Button>
            {secondaryAction}
            {previewError ? (
              <p className="text-center text-xs text-destructive" role="alert">
                {previewError}
              </p>
            ) : null}
            {copy.footnote ? (
              <p className="text-center text-xs text-muted-foreground">{copy.footnote}</p>
            ) : null}
            <p className="sr-only">{MARKETING_PLAN.description}</p>
          </>
        }
      />
    </PricingSection>
  );
}
