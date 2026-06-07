"use client";

import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { animate, createScope } from "animejs";

import { AppLoadingLogoDrawable } from "@/components/brand/app-loading-logo-drawable";
import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { SplineHeroScene } from "@/components/marketing/landing/spline-hero-scene";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appLoginUrl } from "@/lib/site-urls";

const copy = landingPageContent.hero;

function useHeroStats(scopeRef: React.RefObject<HTMLElement | null>, reduced: boolean) {
  useEffect(() => {
    const root = scopeRef.current;
    if (!root || reduced) return;

    const nodes = root.querySelectorAll<HTMLElement>("[data-stat-value]");
    if (!nodes.length) return;

    const animeScope = createScope({ root });

    animeScope.add(() => {
      nodes.forEach((node) => {
        const target = Number(node.dataset.statTarget ?? "0");
        const suffix = node.dataset.statSuffix ?? "";
        const obj = { val: 0 };

        animate(obj, {
          val: target,
          ease: "outExpo",
          duration: 1400,
          delay: Number(node.dataset.statDelay ?? 0),
          onUpdate: () => {
            node.textContent = `${Math.round(obj.val)}${suffix}`;
          },
        });
      });
    });

    return () => animeScope.revert();
  }, [scopeRef, reduced]);
}

export function LandingHero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  useHeroStats(ref, reduced);

  useGSAP(
    () => {
      if (!ref.current || reduced) return;
      gsap.from("[data-hero-in]", {
        opacity: 0,
        y: 36,
        duration: 0.85,
        stagger: 0.09,
        ease: "power3.out",
        delay: 0.12,
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section ref={ref} className="landing-section relative overflow-hidden pb-8 pt-6 md:pt-10">
      <div className="landing-hero-mesh" aria-hidden />
      <div className="landing-container landing-hero-grid relative z-10">
        <div className="space-y-7">
          <div data-hero-in className="flex items-center gap-3">
            <AppLoadingLogoDrawable size={44} className="text-primary" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" aria-hidden />
              {copy.badge}
            </span>
          </div>

          <h1 data-hero-in className="landing-display text-balance">
            {copy.title}
          </h1>

          <p data-hero-in className="landing-lead max-w-2xl text-pretty">
            {copy.subtitle}
          </p>

          <div data-hero-in className="flex flex-wrap items-center gap-3 pt-1">
            <Button size="lg" render={<Link href={marketingRoutes.product} />}>
              {copy.ctaPrimary}
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
            <Button variant="outline" size="lg" render={<Link href={appLoginUrl()} />}>
              {copy.ctaSecondary}
            </Button>
          </div>

          <dl data-hero-in className="grid gap-6 pt-4 sm:grid-cols-3">
            {copy.proof.map((item, i) => (
              <div key={item.label} className="space-y-1">
                <dt className="sr-only">{item.label}</dt>
                <dd className="landing-stat-value text-foreground">
                  <span
                    data-stat-value
                    data-stat-target={item.value}
                    data-stat-suffix={item.suffix}
                    data-stat-delay={i * 120}
                  >
                    0{item.suffix}
                  </span>
                </dd>
                <dd className="text-sm leading-snug text-muted-foreground">{item.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div data-hero-in className="relative">
          <SplineHeroScene />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Интерактивная 3D-сцена · данные приложения — справа в{" "}
            <Link href={marketingRoutes.product} className="text-primary hover:underline">
              обзоре продукта
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
