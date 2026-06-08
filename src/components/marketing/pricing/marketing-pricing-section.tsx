"use client";

import { useState } from "react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingPricingCard } from "@/components/marketing/pricing/marketing-pricing-card";
import {
  PricingFrequency,
  PricingFrequencyToggle,
} from "@/components/marketing/pricing/pricing-frequency-toggle";
import { appDemoUrl } from "@/lib/site-urls";

const copy = marketingSiteContent.pricing;

function planHref(planId: string): string {
  if (planId === "enterprise") return "mailto:enterprise@autocore.app";
  return appDemoUrl();
}

export function MarketingPricingSection() {
  const [frequency, setFrequency] = useState<PricingFrequency>("monthly");

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
            href={planHref(plan.id)}
          />
        ))}
      </div>
    </section>
  );
}
