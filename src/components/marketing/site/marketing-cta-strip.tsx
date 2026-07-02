"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { useGsapReveal, useGsapSplitHeading } from "@/components/marketing/motion/use-gsap-reveal";
import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appDemoUrl } from "@/lib/site-urls";

type MarketingCtaStripProps = {
  title?: string;
  description?: string;
};

const defaults = marketingSiteContent.cta;

export function MarketingCtaStrip({
  title = defaults.title,
  description = defaults.description,
}: MarketingCtaStripProps) {
  const ref = useRef<HTMLElement>(null);
  useGsapSplitHeading(ref, "[data-cta-strip-heading]");
  useGsapReveal(ref, "[data-cta-strip-reveal]", { stagger: 0.1, y: 20 });

  return (
    <section ref={ref} className="marketing-cta-strip">
      <div className="landing-container marketing-cta-strip-inner">
        <h2 data-cta-strip-heading className="marketing-cta-strip-title">
          {title}
        </h2>
        <p className="landing-lead mx-auto mt-4 max-w-lg text-center" data-cta-strip-reveal>
          {description}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3" data-cta-strip-reveal>
          <Button size="lg" render={<Link href={appDemoUrl()} />} nativeButton={false}>
            {defaults.primary}
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
          <Button variant="outline" size="lg" render={<Link href={marketingRoutes.modules} />} nativeButton={false}>
            {defaults.secondary}
          </Button>
        </div>
      </div>
    </section>
  );
}
