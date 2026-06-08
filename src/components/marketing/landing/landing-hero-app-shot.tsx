"use client";

import { OperationalPreview } from "@/components/marketing/ui/operational-preview";
import { cn } from "@/lib/utils";

type LandingHeroAppShotProps = {
  className?: string;
};

export function LandingHeroAppShot({ className }: LandingHeroAppShotProps) {
  return (
    <div className={cn("landing-hero-shot", className)} data-hero-shot>
      <div className="landing-hero-shot-glow" aria-hidden />
      <div className="landing-hero-shot-stage">
        <div className="landing-hero-shot-frame">
          <OperationalPreview layout="showcase" className="landing-hero-shot-preview" />
        </div>
      </div>
    </div>
  );
}
