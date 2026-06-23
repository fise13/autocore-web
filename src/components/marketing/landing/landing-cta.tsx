"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { useGsapReveal, useGsapSplitHeading } from "@/components/marketing/motion/use-gsap-reveal";
import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appDemoUrl } from "@/lib/site-urls";

const copy = landingPageContent.cta;

export function LandingCta() {
  const ref = useRef<HTMLElement>(null);
  useGsapSplitHeading(ref, "[data-cta-heading]");
  useGsapReveal(ref, "[data-cta-reveal]", { stagger: 0.1, y: 18 });

  return (
    <section ref={ref} className="landing-cta">
      <div className="landing-container landing-cta-inner">
        <h2 data-cta-heading className="landing-cta-title">
          {copy.title}
        </h2>
        <p className="landing-lead mx-auto mt-5 max-w-md text-center" data-cta-reveal>
          {copy.description}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3" data-cta-reveal>
          <Button size="lg" render={<Link href={appDemoUrl()} />}>
            {copy.primary}
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
          <Button variant="ghost" size="lg" render={<Link href={marketingRoutes.pricing} />}>
            {copy.secondary}
          </Button>
        </div>
      </div>
    </section>
  );
}
