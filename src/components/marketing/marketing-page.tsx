"use client";

import dynamic from "next/dynamic";

import { CrossPlatformSection } from "@/components/marketing/sections/cross-platform-section";
import { LandingCompare } from "@/components/marketing/landing/landing-compare";
import { LandingCta } from "@/components/marketing/landing/landing-cta";
import { LandingFaq } from "@/components/marketing/landing/landing-faq";
import { LandingHero } from "@/components/marketing/landing/landing-hero";
import { LandingStoryScroll } from "@/components/marketing/landing/landing-story-scroll";

const LandingDocuments = dynamic(
  () =>
    import("@/components/marketing/landing/landing-documents").then((m) => m.LandingDocuments),
  { ssr: false },
);

const LandingDemo = dynamic(
  () => import("@/components/marketing/landing/landing-demo").then((m) => m.LandingDemo),
  { ssr: false },
);

export function MarketingPage() {
  return (
    <div className="landing-page overflow-x-hidden">
      <LandingHero />
      <LandingStoryScroll />
      <LandingDocuments />
      <LandingDemo />
      <LandingCompare />
      <CrossPlatformSection />
      <LandingFaq />
      <LandingCta />
    </div>
  );
}
