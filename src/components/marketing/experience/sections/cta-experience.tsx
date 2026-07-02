"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { landingContent } from "@/components/marketing/experience/content/landing-content";
import { CtaVisualBackdrop } from "@/components/marketing/experience/mocks/cta-visual-backdrop";
import { Button } from "@/components/ui/button";
import { appDemoUrl } from "@/lib/site-urls";

const copy = landingContent.cta;
const EASE = [0.16, 1, 0.3, 1] as const;

export function CtaExperience() {
  const reduced = useReducedMotion();

  return (
    <section className="exp-cta relative border-t border-border/40" aria-labelledby="cta-heading">
      <CtaVisualBackdrop className="absolute inset-0" />

      <div className="exp-cta-stage exp-section-inner relative z-10 flex min-h-[min(72vh,40rem)] flex-col items-center justify-center py-28 text-center sm:py-36">
        <motion.h2
          id="cta-heading"
          className="exp-display max-w-3xl text-4xl tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <span className="block">{copy.titleLine1}</span>
          <span className="mt-2 block text-muted-foreground">{copy.titleLine2}</span>
        </motion.h2>

        <motion.p
          className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base"
          initial={reduced ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, delay: 0.06, ease: EASE }}
        >
          {copy.description}
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
          initial={reduced ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.45, delay: 0.12, ease: EASE }}
        >
          <Button
            size="lg"
            className="h-10 min-w-[11rem] px-5 text-sm"
            render={<Link href={appDemoUrl()} />}
            nativeButton={false}
          >
            {copy.primary}
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-10 min-w-[11rem] px-5 text-sm font-normal text-muted-foreground hover:text-foreground"
            render={<Link href={copy.secondaryHref} />}
            nativeButton={false}
          >
            {copy.secondary}
          </Button>
        </motion.div>

        <motion.p
          className="mt-12 max-w-lg text-xs leading-relaxed text-muted-foreground/80"
          initial={reduced ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.18, ease: EASE }}
        >
          {copy.trust.map((item) => item.label).join(" · ")}
        </motion.p>
      </div>
    </section>
  );
}
