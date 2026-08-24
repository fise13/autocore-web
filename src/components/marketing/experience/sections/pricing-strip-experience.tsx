"use client";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { MarketingPaddlePlan } from "@/components/marketing/pricing/marketing-paddle-plan";
import { SectionReveal, SectionShell } from "@/components/marketing/experience/ui/section-shell";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";

export function PricingStripExperience() {
  const copy = useLandingContent().pricing;

  return (
    <SectionShell className="exp-pricing-strip" ariaLabelledby="pricing-strip-heading">
      <SectionReveal className="exp-pricing-strip-inner">
        <h2 id="pricing-strip-heading" className="exp-display exp-pricing-strip-title">
          {copy.title}
        </h2>

        <div className="exp-pricing-strip-card">
          <MarketingPaddlePlan
            fallbackPrice={copy.price}
            fallbackPeriod={copy.period}
            fallbackYearlyPrice={copy.yearlyPrice}
            fallbackYearlyPeriod={copy.yearlyPeriod}
            monthlyLabel={copy.monthlyLabel}
            yearlyLabel={copy.yearlyLabel}
            intervalAriaLabel={copy.intervalAria}
            note={copy.note}
            yearlySaveLabel={copy.yearlySave}
            buyLabel={copy.buy}
            buyVariant="default"
            priceClassName="exp-pricing-strip-amount"
            secondaryAction={<TrialButton variant="outline">{copy.trial}</TrialButton>}
          />
        </div>

        <ul className="exp-pricing-strip-included">
          {copy.included.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <p className="exp-pricing-strip-risk">{copy.risk}</p>
      </SectionReveal>
    </SectionShell>
  );
}
