"use client";

import { motion, useReducedMotion } from "motion/react";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { SectionShell } from "@/components/marketing/experience/ui/section-shell";

const EASE = [0.16, 1, 0.3, 1] as const;

export function ChaosExperience() {
  const reduced = useReducedMotion();
  const { chaos: copy } = useLandingContent();

  return (
    <SectionShell className="exp-chaos" ariaLabelledby="chaos-heading">
      <div className="exp-chaos-layout">
        <motion.header
          className="exp-chaos-header"
          initial={reduced ? false : { opacity: 0, y: 18, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.75, ease: EASE }}
        >
          <p className="exp-chaos-eyebrow">{copy.eyebrow}</p>
          <h2 id="chaos-heading" className="exp-chaos-title">
            {copy.title}
          </h2>
          <p className="exp-chaos-sub">{copy.subtitle}</p>
        </motion.header>

        <ol className="exp-chaos-day">
          {copy.items.map((item, index) => (
            <motion.li
              key={item.time}
              className="exp-chaos-beat"
              initial={reduced ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.65, delay: 0.08 + index * 0.08, ease: EASE }}
            >
              <div className="exp-chaos-rail" aria-hidden>
                <span className="exp-chaos-dot" />
              </div>
              <time className="exp-chaos-time" dateTime={item.time}>
                {item.time}
              </time>
              <p className="exp-chaos-text">{item.text}</p>
            </motion.li>
          ))}
        </ol>

        <motion.div
          className="exp-chaos-footer"
          initial={reduced ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, delay: 0.4, ease: EASE }}
        >
          <a href={copy.ctaHref} className="exp-chaos-cta">
            {copy.cta}
            <span aria-hidden>↓</span>
          </a>
        </motion.div>
      </div>
    </SectionShell>
  );
}
