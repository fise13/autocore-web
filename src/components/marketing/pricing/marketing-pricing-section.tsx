"use client";

import { useState } from "react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingPricingCard } from "@/components/marketing/pricing/marketing-pricing-card";
import {
  PricingFrequency,
  PricingFrequencyToggle,
} from "@/components/marketing/pricing/pricing-frequency-toggle";
import { StripeBillingInterval } from "@/lib/stripe/prices";
import { storePendingBillingIntent } from "@/lib/marketing/pending-billing-intent";
import { marketingProSignupUrl, marketingTrialSignupUrl } from "@/lib/marketing/trial-signup-url";

const copy = marketingSiteContent.pricing;

function signupUrl(intent: "trial" | "pro", interval?: StripeBillingInterval): string {
  if (intent === "trial") return marketingTrialSignupUrl();
  return marketingProSignupUrl(interval ?? "monthly");
}

function planHref(planId: string, frequency: PricingFrequency): string {
  if (planId === "enterprise") return "mailto:enterprise@autocore.app";
  if (planId === "trial") return signupUrl("trial");
  if (planId === "pro") return signupUrl("pro", frequency);
  return marketingTrialSignupUrl();
}

export function MarketingPricingSection() {
  const [frequency, setFrequency] = useState<PricingFrequency>("monthly");

  function startTrialSignup() {
    storePendingBillingIntent({ type: "trial" });
    window.location.href = signupUrl("trial");
  }

  function startProCheckout() {
    storePendingBillingIntent({ type: "pro", interval: frequency });
    window.location.href = signupUrl("pro", frequency);
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

      <div className="marketing-pricing-grid">
        {copy.plans.map((plan) => (
          <MarketingPricingCard
            key={plan.id}
            plan={plan}
            frequency={frequency}
            billingCopy={copy.billing}
            href={planHref(plan.id, frequency)}
            onTrialSignup={plan.id === "trial" ? startTrialSignup : undefined}
            onProCheckout={plan.id === "pro" ? startProCheckout : undefined}
          />
        ))}
      </div>
    </section>
  );
}
