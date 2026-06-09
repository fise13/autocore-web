"use client";

import { LandingCompare } from "@/components/marketing/landing/landing-compare";
import { LandingCta } from "@/components/marketing/landing/landing-cta";
import { LandingDemo } from "@/components/marketing/landing/landing-demo";
import { LandingDocuments } from "@/components/marketing/landing/landing-documents";
import { LandingFaq } from "@/components/marketing/landing/landing-faq";
import { LandingHero } from "@/components/marketing/landing/landing-hero";
import { LandingStoryScroll } from "@/components/marketing/landing/landing-story-scroll";
import { DesktopDownloadSection } from "@/components/marketing/sections/desktop-download-section";

export function MarketingPage() {
  return (
    <div className="landing-page overflow-x-hidden">
      <LandingHero />
      <LandingStoryScroll />
      <LandingDocuments />
      <LandingDemo />
      <LandingCompare />
      <DesktopDownloadSection />
      <LandingFaq />
      <LandingCta />
    </div>
  );
}
