"use client";

import { useState } from "react";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { BuyModal } from "@/components/marketing/experience/ui/buy-modal";
import { SectionReveal, SectionShell } from "@/components/marketing/experience/ui/section-shell";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";
import { Button } from "@/components/ui/button";

export function PricingStripExperience() {
  const copy = useLandingContent().pricing;
  const [buyOpen, setBuyOpen] = useState(false);

  return (
    <SectionShell className="exp-pricing-strip border-t border-border/40" ariaLabelledby="pricing-strip-heading">
      <BuyModal open={buyOpen} onOpenChange={setBuyOpen} />

      <SectionReveal className="mx-auto max-w-xl text-center">
        <h2 id="pricing-strip-heading" className="exp-display text-3xl tracking-tight sm:text-4xl">
          {copy.title}
        </h2>

        <div className="mt-10 flex flex-wrap items-baseline justify-center gap-2">
          <span className="exp-display text-6xl tracking-tight sm:text-7xl">{copy.price}</span>
          <span className="text-lg text-muted-foreground sm:text-xl">{copy.period}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{copy.note}</p>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {copy.included.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <p className="mt-6 text-xs text-muted-foreground">{copy.risk}</p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <TrialButton>{copy.trial}</TrialButton>
          <Button
            size="lg"
            variant="outline"
            className="h-10 min-w-[11rem] px-5 text-sm"
            onClick={() => setBuyOpen(true)}
          >
            {copy.buy}
          </Button>
        </div>
      </SectionReveal>
    </SectionShell>
  );
}
