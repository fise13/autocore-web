"use client";

import { LandingAudience } from "@/components/marketing/landing/landing-audience";
import { LandingCta, LandingMarquee } from "@/components/marketing/landing/landing-cta";
import { LandingDayFlow } from "@/components/marketing/landing/landing-day-flow";
import { LandingFaq } from "@/components/marketing/landing/landing-faq";
import { LandingHero } from "@/components/marketing/landing/landing-hero";
import { LandingModules } from "@/components/marketing/landing/landing-modules";
import { LandingPlatforms } from "@/components/marketing/landing/landing-platforms";
import { LandingProductShowcase } from "@/components/marketing/landing/landing-product-showcase";
import { LandingRealtime } from "@/components/marketing/landing/landing-realtime";
import { LandingStory } from "@/components/marketing/landing/landing-story";

export function MarketingPage() {
  return (
    <>
      <LandingHero />
      <LandingMarquee />
      <LandingProductShowcase />
      <LandingAudience />
      <LandingStory />
      <LandingModules />
      <LandingDayFlow />
      <LandingRealtime />
      <LandingPlatforms />
      <LandingFaq />
      <LandingCta />
    </>
  );
}
