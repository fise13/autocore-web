"use client";

import { motion, useReducedMotion } from "motion/react";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { OutcomeMotorsAtmosphere } from "@/components/marketing/experience/surfaces/outcome-motors-atmosphere";

const EASE = [0.16, 1, 0.3, 1] as const;

export function OwnerOutcomeExperience() {
  const reduced = useReducedMotion();
  const { outcome: copy } = useLandingContent();

  return (
    <section className="exp-outcome" aria-labelledby="outcome-heading">
      <div className="exp-outcome-frame">
        <div className="exp-outcome-grid-bg" aria-hidden>
          <motion.div
            className="exp-outcome-grid-reveal"
            initial={reduced ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.25, ease: EASE }}
          >
            <OutcomeMotorsAtmosphere />
          </motion.div>
        </div>

        <div className="exp-outcome-veil" aria-hidden />

        <div className="exp-outcome-copy">
          <motion.h2
            id="outcome-heading"
            className="exp-outcome-title"
            initial={reduced ? false : { opacity: 0, y: 22, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.85, ease: EASE }}
          >
            {copy.title}
          </motion.h2>

          <motion.p
            className="exp-outcome-sub"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.12, ease: EASE }}
          >
            {copy.subtitle}
          </motion.p>

          <motion.div
            className="exp-outcome-actions"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.65, delay: 0.24, ease: EASE }}
          >
            <a href={copy.ctaHref} className="exp-outcome-cta">
              {copy.cta}
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
