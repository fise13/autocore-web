"use client";

import { LandingLenisProvider } from "@/components/marketing/experience/motion/landing-lenis-provider";
import { CtaExperience } from "@/components/marketing/experience/sections/cta-experience";
import { HeroExperience } from "@/components/marketing/experience/sections/hero-experience";
import { OsPhilosophy } from "@/components/marketing/experience/sections/os-philosophy";
import { PlatformStrip } from "@/components/marketing/experience/sections/platform-strip";
import { ProductShowcase } from "@/components/marketing/experience/sections/product-showcase";

export function ExperienceLandingPage() {
  return (
    <LandingLenisProvider>
      <div className="landing-page overflow-x-hidden">
        <HeroExperience />
        <OsPhilosophy />
        <ProductShowcase />
        <PlatformStrip />
        <CtaExperience />
      </div>
    </LandingLenisProvider>
  );
}
