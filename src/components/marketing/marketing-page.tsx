"use client";

import { MarketingMotionProvider } from "@/components/marketing/motion/marketing-motion-provider";
import { KnowledgeGraphSection } from "@/components/marketing/stripe/knowledge-graph-section";
import { StripeClose } from "@/components/marketing/stripe/stripe-close";
import { StripeFaq } from "@/components/marketing/stripe/stripe-faq";
import { StripeHero } from "@/components/marketing/stripe/stripe-hero";
import { StripeModuleAtlas } from "@/components/marketing/stripe/stripe-module-atlas";
import { StripePillars } from "@/components/marketing/stripe/stripe-pillars";
import { StripePlatform } from "@/components/marketing/stripe/stripe-platform";
import { StripeProcess } from "@/components/marketing/stripe/stripe-process";
import { SiteShell } from "@/components/marketing/site/site-shell";

export function MarketingPage() {
  return (
    <MarketingMotionProvider>
      <SiteShell>
        <StripeHero />
        <KnowledgeGraphSection />
        <StripePillars />
        <StripeModuleAtlas />
        <StripeProcess />
        <StripePlatform />
        <StripeFaq />
        <StripeClose />
      </SiteShell>
    </MarketingMotionProvider>
  );
}
