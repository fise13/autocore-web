"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appLoginUrl } from "@/lib/site-urls";

const copy = landingPageContent.cta;
const marquee = landingPageContent.marquee;

export function LandingMarquee() {
  const items = [...marquee, ...marquee];

  return (
    <div className="overflow-hidden border-y border-border/80 bg-background py-4" aria-hidden>
      <div className="landing-marquee-track gap-10 px-4">
        {items.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="shrink-0 text-sm font-medium tracking-wide text-muted-foreground uppercase"
          >
            {label}
            <span className="mx-10 text-primary/40">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function LandingCta() {
  return (
    <section className="landing-section border-t border-border/80">
      <div className="landing-container">
        <div className="landing-card relative overflow-hidden px-6 py-14 text-center md:px-16 md:py-20">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--landing-glow),transparent_65%)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-2xl space-y-6">
            <h2 className="landing-display text-balance">{copy.title}</h2>
            <p className="landing-lead mx-auto">{copy.description}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button size="lg" render={<Link href={appLoginUrl()} />}>
                {copy.primary}
                <ArrowRight className="size-4" data-icon="inline-end" />
              </Button>
              <Button variant="outline" size="lg" render={<Link href={marketingRoutes.modules} />}>
                {copy.secondary}
              </Button>
              <Button variant="ghost" size="lg" render={<Link href={marketingRoutes.contact} />}>
                {copy.tertiary}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
