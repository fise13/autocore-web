"use client";

import { useState } from "react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingPricingCard } from "@/components/marketing/pricing/marketing-pricing-card";
import {
  PricingFrequency,
  PricingFrequencyToggle,
} from "@/components/marketing/pricing/pricing-frequency-toggle";
import { appLoginUrl } from "@/lib/site-urls";

const copy = marketingSiteContent.pricing;

function planHref(planId: string): string {
  if (planId === "enterprise") return "mailto:enterprise@autocore.app";
  return appLoginUrl();
}

function resolveCheckoutError(error: unknown): string {
  if (error instanceof TypeError) {
    return "Не удалось связаться с сервером оплаты. Проверьте интернет и попробуйте снова.";
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Не удалось начать оплату";
}

export function MarketingPricingSection() {
  const [frequency, setFrequency] = useState<PricingFrequency>("monthly");
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function startProCheckout() {
    setCheckoutPlanId("pro");
    setCheckoutError(null);
    try {
      const response = await fetch("/api/marketing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: frequency }),
      });

      let payload: { url?: string; error?: string } | null = null;
      try {
        payload = (await response.json()) as { url?: string; error?: string };
      } catch {
        throw new TypeError("invalid-json");
      }

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Не удалось начать оплату");
      }

      window.location.assign(payload.url);
    } catch (error) {
      setCheckoutError(resolveCheckoutError(error));
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
