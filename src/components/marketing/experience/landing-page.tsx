import { ChaosExperience } from "@/components/marketing/experience/sections/chaos-experience";
import { CtaExperience } from "@/components/marketing/experience/sections/cta-experience";
import { HeroExperience } from "@/components/marketing/experience/sections/hero-experience";
import { InteractiveSaleExperience } from "@/components/marketing/experience/sections/interactive-sale-experience";
import { OwnerOutcomeExperience } from "@/components/marketing/experience/sections/owner-outcome-experience";

/** Server shell: motion lives in client section islands. */
export function ExperienceLandingPage() {
  return (
    <div className="landing-page overflow-x-hidden">
      <HeroExperience />
      <ChaosExperience />
      <OwnerOutcomeExperience />
      <InteractiveSaleExperience />
      <CtaExperience />
    </div>
  );
}
