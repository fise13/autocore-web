"use client";

import { motion, useReducedMotion } from "motion/react";

import { landingContent } from "@/components/marketing/experience/content/landing-content";
import { PlatformSyncExperience } from "@/components/marketing/experience/mocks/platform-sync-experience";

const copy = landingContent.platform;

export function PlatformStrip() {
  const reduced = useReducedMotion();

  return (
    <section className="exp-section border-t border-border">
      <div className="exp-section-inner grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
        <motion.div
          className="max-w-md lg:pt-2"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="exp-display text-3xl tracking-tight sm:text-4xl">{copy.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{copy.description}</p>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <PlatformSyncExperience />
        </motion.div>
      </div>
    </section>
  );
}
