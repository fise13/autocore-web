"use client";

import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";

import { siteContent } from "@/components/marketing/content/site-content";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { OperationalPreview } from "@/components/marketing/ui/operational-preview";
import { marketingRoutes } from "@/lib/marketing-routes";

const copy = siteContent.hero;

export function StripeHero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (!ref.current || reduced) return;
      gsap.from("[data-hero-in]", {
        opacity: 0,
        y: 32,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section ref={ref} className="stripe-hero">
      <div className="stripe-hero-mesh" aria-hidden />
      <div className="stripe-container stripe-hero-grid">
        <div className="stripe-hero-copy">
          <p data-hero-in className="stripe-eyebrow">
            {copy.eyebrow}
          </p>
          <h1 data-hero-in className="stripe-display">
            {copy.title}
          </h1>
          <p data-hero-in className="stripe-lead max-w-xl">
            {copy.subtitle}
          </p>
          <div data-hero-in className="mt-8 flex flex-wrap gap-6 text-sm font-medium">
            <Link href="#graph" className="stripe-link">
              {copy.exploreGraph}
            </Link>
            <Link href="#modules" className="stripe-link-muted">
              {copy.exploreModules}
            </Link>
            <Link href={marketingRoutes.product} className="stripe-link-muted">
              О продукте
            </Link>
          </div>
        </div>
        <div data-hero-in className="stripe-hero-preview">
          <OperationalPreview large />
        </div>
      </div>
    </section>
  );
}
