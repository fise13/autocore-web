"use client";

import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

import { landingDemoAnchor, landingPageContent } from "@/components/marketing/content/landing-page-content";
import { DesktopDownloadButtons } from "@/components/marketing/desktop-download-buttons";
import { LandingHeroAppShot } from "@/components/marketing/landing/landing-hero-app-shot";
import { useGsapSplitHero } from "@/components/marketing/motion/use-gsap-reveal";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { Button } from "@/components/ui/button";
import { storePendingBillingIntent } from "@/lib/marketing/pending-billing-intent";
import { marketingTrialSignupUrl } from "@/lib/marketing/trial-signup-url";
import { appDemoUrl } from "@/lib/site-urls";

const copy = landingPageContent.hero;

export function LandingHero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useGsapSplitHero(ref, "[data-hero-title]");

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || reduced) return;

      gsap.set("[data-hero-fade]", { opacity: 0, y: 24 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.2 });
      tl.to("[data-hero-fade]", { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 });
      tl.from("[data-hero-shot]", { opacity: 0, y: 36, scale: 0.98, duration: 1.05 }, 0.15);
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section ref={ref} className="landing-hero">
      <div aria-hidden className="landing-hero-bg" />

      <div className="landing-hero-shell">
        <div className="landing-hero-copy">
          <Link
            data-hero-fade
            href={marketingTrialSignupUrl()}
            onClick={() => storePendingBillingIntent({ type: "trial" })}
            className="landing-hero-announcement group"
          >
            <span className="landing-hero-announcement-tag">{copy.announcementTag}</span>
            <span className="landing-hero-announcement-label">{copy.announcement}</span>
            <span className="landing-hero-announcement-divider" aria-hidden />
            <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>

          <h1 className="landing-hero-title">
            <span data-hero-title className="block">
              {copy.titleLine1}
            </span>
            <span data-hero-title className="block">
              {copy.titleLine2}
            </span>
            <span data-hero-title className="block text-muted-foreground">
              {copy.titleLine3}
            </span>
          </h1>

          <p data-hero-fade className="landing-hero-lead">
            {copy.subtitle}
          </p>

          <div data-hero-fade className="landing-hero-actions">
            <Button size="lg" render={<Link href={appDemoUrl()} />}>
              {copy.ctaPrimary}
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
            <Button variant="outline" size="lg" render={<Link href={landingDemoAnchor} />}>
              {copy.ctaSecondary}
            </Button>
          </div>

          <div data-hero-fade className="landing-hero-downloads">
            <DesktopDownloadButtons size="lg" />
          </div>
        </div>

        <LandingHeroAppShot />
      </div>
    </section>
  );
}
