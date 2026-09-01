"use client";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { SectionReveal, SectionShell } from "@/components/marketing/experience/ui/section-shell";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";
import { MarketingPricingBlock } from "@/components/marketing/pricing/marketing-pricing-block";

export function PricingStripExperience() {
  const copy = useLandingContent().pricing;

  return (
    <SectionShell className="exp-pricing-strip" ariaLabelledby="pricing-strip-heading">
      <SectionReveal>
        <MarketingPricingBlock
          layoutId="landing-frequency"
          copy={{
            title: copy.title,
            titleId: "pricing-strip-heading",
            titleAs: "h2",
            description: copy.risk,
            planName: copy.planName,
            planInfo: copy.note,
            features: copy.included,
            monthlyLabel: copy.monthlyLabel,
            yearlyLabel: copy.yearlyLabel,
            intervalAria: copy.intervalAria,
            billedMonthly: copy.billedMonthly,
            billedYearly: copy.billedYearly,
            monthlySuffix: copy.period,
            yearlySuffix: copy.yearlyPeriod,
            yearlySave: copy.yearlySave,
            buyLabel: copy.buy,
          }}
          secondaryAction={
            <TrialButton variant="outline" className="w-full">
              {copy.trial}
            </TrialButton>
          }
        />
      </SectionReveal>
    </SectionShell>
  );
}
