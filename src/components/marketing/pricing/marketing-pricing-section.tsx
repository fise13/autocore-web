"use client";

import { useState } from "react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingPricingCard } from "@/components/marketing/pricing/marketing-pricing-card";
import {
  PricingFrequency,
  PricingFrequencyToggle,
} from "@/components/marketing/pricing/pricing-frequency-toggle";
import { startMarketingProCheckout } from "@/infrastructure/stripe/billing-service";
import { appLoginUrl } from "@/lib/site-urls";
import { userCopy } from "@/lib/user-copy";

const copy = marketingSiteContent.pricing;

function planHref(planId: string): string {
  if (planId === "enterprise") return "mailto:enterprise@autocore.app";
  return appLoginUrl();
}

export function MarketingPricingSection() {
  const [frequency, setFrequency] = useState<PricingFrequency>("monthly");
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function startProCheckout() {
    setCheckoutPlanId("pro");
    setCheckoutError(null);
    try {
      const url = await startMarketingProCheckout(frequency);
      window.location.assign(url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : userCopy.billing.checkoutError);
      setCheckoutPlanId(null);
    }
  }

  return (
    <section className="marketing-pricing-section" aria-label="Тарифные планы">
      <div className="marketing-pricing-section-toolbar">
        <PricingFrequencyToggle
          value={frequency}
          onChange={setFrequency}
          monthlyLabel={copy.billing.monthlyLabel}
          yearlyLabel={copy.billing.yearlyLabel}
          yearlySave={copy.billing.yearlySave}
        />
      </div>

      {checkoutError ? (
        <p role="alert" className="marketing-pricing-checkout-error text-sm text-destructive">
          {checkoutError}
        </p>
      ) : null}

      <div className="marketing-pricing-grid">
        {copy.plans.map((plan) => (
          <MarketingPricingCard
            key={plan.id}
            plan={plan}
            frequency={frequency}
            billingCopy={copy.billing}
            href={planHref(plan.id)}
            onProCheckout={plan.id === "pro" ? startProCheckout : undefined}
            isCheckoutLoading={checkoutPlanId === plan.id}
          />
        ))}
      </div>
    </section>
  );
}
