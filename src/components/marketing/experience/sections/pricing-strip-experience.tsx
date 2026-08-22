"use client";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { MarketingPaddlePlan } from "@/components/marketing/pricing/marketing-paddle-plan";
import { SectionReveal, SectionShell } from "@/components/marketing/experience/ui/section-shell";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";

export function PricingStripExperience() {
  const copy = useLandingContent().pricing;

  return (
    <SectionShell className="exp-pricing-strip border-t border-border/40" ariaLabelledby="pricing-strip-heading">
      <SectionReveal className="mx-auto max-w-xl text-center">
        <h2 id="pricing-strip-heading" className="exp-display text-3xl tracking-tight sm:text-4xl">
          {copy.title}
        </h2>

        <div className="mt-10">
          <MarketingPaddlePlan
            fallbackPrice={copy.price}
            fallbackPeriod={copy.period}
            fallbackYearlyPrice={copy.yearlyPrice}
            fallbackYearlyPeriod={copy.yearlyPeriod}
            monthlyLabel={copy.monthlyLabel}
            yearlyLabel={copy.yearlyLabel}
            intervalAriaLabel={copy.intervalAria}
            note={copy.note}
            buyLabel={copy.buy}
            priceClassName="text-6xl sm:text-7xl"
          />
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {copy.included.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <p className="mt-6 text-xs text-muted-foreground">{copy.risk}</p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <TrialButton>{copy.trial}</TrialButton>
        </div>
      </SectionReveal>
    </SectionShell>
  );
}
