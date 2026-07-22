"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { ProductAppSurface } from "@/components/marketing/experience/surfaces/product-app-surface";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";

/** Linear entrance curve */
const EASE = [0.16, 1, 0.3, 1] as const;

function FadeUp({
  children,
  className,
  delay,
  duration = 0.7,
  y = 14,
}: {
  children: ReactNode;
  className?: string;
  delay: number;
  duration?: number;
  y?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function TitleReveal({ title }: { title: string }) {
  const reduced = useReducedMotion();
  const titleWords = title.split(/\s+/).filter(Boolean);

  if (reduced) {
    return <h1 className="exp-hero-linear-title">{title}</h1>;
  }

  return (
    <h1 className="exp-hero-linear-title" aria-label={title}>
      {titleWords.map((word, index) => (
        <span key={`${word}-${index}`}>
          <motion.span
            className="exp-hero-linear-word"
            initial={{ opacity: 0, y: 22, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.9,
              delay: 0.08 + index * 0.055,
              ease: EASE,
            }}
          >
            {word}
          </motion.span>
          {index < titleWords.length - 1 ? " " : null}
        </span>
      ))}
    </h1>
  );
}

export function HeroExperience() {
  const reduced = useReducedMotion();
  const { hero: copy } = useLandingContent();

  return (
    <section className="exp-hero-linear" aria-label={copy.ariaLabel}>
      <div className="exp-hero-linear-shell">
        <div className="exp-hero-linear-copy">
          <div className="exp-hero-linear-title-wrap">
            <TitleReveal title={copy.title} />
          </div>

          <FadeUp className="exp-hero-linear-sub-wrap" delay={0.28} duration={0.75} y={12}>
            <p className="exp-hero-linear-sub">{copy.subtitle}</p>
          </FadeUp>

          <FadeUp className="exp-hero-linear-actions" delay={0.42} duration={0.65} y={10}>
            <TrialButton className="exp-hero-linear-cta-primary">{copy.ctaPrimary}</TrialButton>
          </FadeUp>

          <FadeUp delay={0.54} duration={0.55} y={8}>
            <p className="exp-hero-linear-trust">{copy.trust}</p>
          </FadeUp>
        </div>

        <motion.div
          className="exp-hero-linear-stage"
          initial={
            reduced ? false : { opacity: 0, y: 48, scale: 0.988, filter: "blur(6px)" }
          }
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.2, delay: 0.62, ease: EASE }}
        >
          <div className="exp-hero-linear-stage-inner">
            <ProductAppSurface compact />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
