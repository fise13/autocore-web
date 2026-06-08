"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

import type { PricingFrequency } from "@/components/marketing/pricing/pricing-frequency-toggle";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MarketingPlan = (typeof import("@/components/marketing/content/marketing-site-content").marketingSiteContent.pricing.plans)[number];

type MarketingPricingCardProps = {
  plan: MarketingPlan;
  frequency: PricingFrequency;
  billingCopy: {
    perMonthSuffix: string;
    yearlyNote: string;
    yearlySave: string;
  };
  href: string;
};

function formatUsd(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `$${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}`;
}

export function MarketingPricingCard({
  plan,
  frequency,
  billingCopy,
  href,
}: MarketingPricingCardProps) {
  const isSubscription = plan.billing === "subscription";
  const isFree = plan.billing === "free";
  const isCustom = plan.billing === "custom";
  const displayPrice = isSubscription
    ? frequency === "yearly"
      ? plan.priceYearly
      : plan.priceMonthly
    : 0;

  return (
    <article
      className={cn(
        "marketing-pricing-card landing-card",
        plan.highlighted && "marketing-pricing-card-highlighted",
      )}
    >
      <AnimatePresence mode="popLayout">
        <div className="marketing-pricing-badges">
          {plan.highlighted && isSubscription && plan.popularLabel ? (
            <motion.span
              key="popular"
              initial={{ opacity: 0, scale: 0.85, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -4 }}
              className="marketing-pricing-badge marketing-pricing-badge-primary"
            >
              {plan.popularLabel}
            </motion.span>
          ) : null}
          {isSubscription && frequency === "yearly" ? (
            <motion.span
              key="yearly-save"
              initial={{ opacity: 0, scale: 0.85, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -4 }}
              className="marketing-pricing-badge marketing-pricing-badge-save"
            >
              {billingCopy.yearlySave}
            </motion.span>
          ) : null}
        </div>
      </AnimatePresence>

      <h2 className="marketing-pricing-card-name">{plan.name}</h2>

      <div className="marketing-pricing-card-price-row">
        {isCustom ? (
          <span className="marketing-pricing-card-price">{plan.customPriceLabel}</span>
        ) : isFree ? (
          <span className="marketing-pricing-card-price">0 ₽</span>
        ) : (
          <>
            <AnimatedNumber
              value={displayPrice}
              format={formatUsd}
              className="marketing-pricing-card-price"
            />
            <span className="marketing-pricing-card-price-suffix">{billingCopy.perMonthSuffix}</span>
          </>
        )}
      </div>

      <p className="marketing-pricing-card-period">
        {isSubscription && frequency === "yearly" ? billingCopy.yearlyNote : plan.period}
      </p>

      <p className="marketing-pricing-card-description">{plan.description}</p>

      <ul className="marketing-pricing-card-features">
        {plan.features.map((feature) => (
          <li key={feature}>
            <Check className="size-4 shrink-0 text-primary" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        className="mt-auto w-full"
        variant={plan.highlighted ? "default" : "outline"}
        size="lg"
        render={<Link href={href} />}
      >
        {plan.cta}
      </Button>
    </article>
  );
}
