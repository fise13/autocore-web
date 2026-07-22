"use client";

import { motion, useReducedMotion } from "motion/react";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { PlatformSyncExperience } from "@/components/marketing/experience/mocks/platform-sync-experience";

export function PlatformStrip() {
  const copy = useLandingContent().platform;
  const reduced = useReducedMotion();

  return (
    <section className="exp-section border-t border-border platform-strip">
      <div className="exp-section-inner grid items-center gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-10 xl:gap-14">
        <motion.div
          className="max-w-md lg:pt-4"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="exp-display text-3xl tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
            {copy.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {copy.description}
          </p>
        </motion.div>

        <div className="platform-strip-visual min-w-0">
          <PlatformSyncExperience hideHeader />
        </div>
      </div>
    </section>
  );
}
