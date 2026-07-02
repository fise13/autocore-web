"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { landingContent } from "@/components/marketing/experience/content/landing-content";
import { MissionControlMock } from "@/components/marketing/experience/mocks/mission-control-mock";
import { Button } from "@/components/ui/button";
import { appDemoUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";

const copy = landingContent.hero;

const EASE = [0.16, 1, 0.3, 1] as const;

type HeroRevealProps = {
  children: ReactNode;
  className?: string;
  delay: number;
  duration: number;
  y?: number;
};

function HeroReveal({ children, className, delay, duration, y = 18 }: HeroRevealProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function HeroExperience() {
  return (
    <section className="exp-hero relative min-h-[100dvh]">
      <div className="exp-section-inner relative z-10 grid min-h-[calc(100dvh-4rem)] items-center gap-10 py-12 lg:grid-cols-2 lg:gap-14 lg:py-16">
        <div className="max-w-lg">
          <HeroReveal delay={0} duration={0.72} y={22}>
            <h1 className="exp-display text-4xl tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              {copy.title}
            </h1>
          </HeroReveal>

          <HeroReveal className="mt-4" delay={0.38} duration={0.58} y={16}>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">{copy.subtitle}</p>
          </HeroReveal>

          <HeroReveal className="mt-8" delay={0.72} duration={0.48} y={14}>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" render={<Link href={appDemoUrl()} />} nativeButton={false}>
                {copy.ctaPrimary}
              </Button>
              <Button size="lg" variant="outline" render={<Link href={copy.ctaSecondaryHref} />} nativeButton={false}>
                {copy.ctaSecondary}
              </Button>
            </div>
          </HeroReveal>
        </div>

        <HeroReveal className="w-full lg:justify-self-end" delay={1.02} duration={0.82} y={28}>
          <div className={cn("exp-mock-shelf p-3 sm:p-4")}>
            <MissionControlMock className="w-full" layout="hero" />
          </div>
        </HeroReveal>
      </div>
    </section>
  );
}
