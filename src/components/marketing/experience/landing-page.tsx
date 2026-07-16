import { CtaExperience } from "@/components/marketing/experience/sections/cta-experience";
import { FaqExperience } from "@/components/marketing/experience/sections/faq-experience";
import { HeroExperience } from "@/components/marketing/experience/sections/hero-experience";
import { OsPhilosophy } from "@/components/marketing/experience/sections/os-philosophy";
import { PlatformStrip } from "@/components/marketing/experience/sections/platform-strip";
import { ProductShowcase } from "@/components/marketing/experience/sections/product-showcase";

/** Server shell: motion lives in client section islands. */
export function ExperienceLandingPage() {
  return (
    <div className="landing-page overflow-x-hidden">
      <HeroExperience />
      <OsPhilosophy />
      <ProductShowcase />
      <PlatformStrip />
      <FaqExperience />
      <CtaExperience />
    </div>
  );
}
