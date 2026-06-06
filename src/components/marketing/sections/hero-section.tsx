"use client";

import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { OperationalPreview } from "@/components/marketing/ui/operational-preview";
import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";

const copy = landingCopy.hero;

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (!sectionRef.current || reduced) return;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from("[data-hero-item]", { opacity: 0, y: 24, stagger: 0.09, duration: 0.7 }).from(
        "[data-hero-preview]",
        { opacity: 0, y: 32, scale: 0.97, duration: 0.85 },
        "-=0.35",
      );
    },
    { scope: sectionRef, dependencies: [reduced] },
  );

  return (
    <section ref={sectionRef} className="site-hero border-b border-border/60">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-8">
            <div data-hero-item className="flex flex-wrap items-center gap-2">
              <span className="site-chip">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {copy.liveBadge}
              </span>
              <span className="site-chip site-chip-neutral">{copy.tag}</span>
            </div>

            <div data-hero-item className="space-y-4">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{copy.brand}</p>
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-[3.25rem]">
                {copy.title}
              </h1>
            </div>

            <p data-hero-item className="max-w-lg text-lg leading-relaxed text-muted-foreground">
              {copy.description}
            </p>

            <div data-hero-item className="flex flex-wrap items-center gap-3">
              <Button size="lg" className="h-11 gap-2 px-6" render={<Link href="#why-business" />}>
                {copy.ctaExplore}
                <ArrowRight className="size-4" data-icon="inline-end" />
              </Button>
              <Button variant="outline" size="lg" className="h-11 px-6" render={<Link href="#modules-deep" />}>
                {copy.ctaModules}
              </Button>
              <Button variant="ghost" size="lg" className="h-11" render={<Link href={marketingRoutes.product} />}>
                {copy.ctaProduct}
              </Button>
            </div>

            <p data-hero-item className="text-sm text-muted-foreground">
              {copy.footnote}
            </p>
          </div>

          <div data-hero-preview>
            <OperationalPreview large />
          </div>
        </div>
      </div>
    </section>
  );
}
