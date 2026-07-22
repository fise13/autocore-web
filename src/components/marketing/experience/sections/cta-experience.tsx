"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { BuyModal } from "@/components/marketing/experience/ui/buy-modal";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";
import { Button } from "@/components/ui/button";

const EASE = [0.16, 1, 0.3, 1] as const;

export function CtaExperience() {
  const reduced = useReducedMotion();
  const [buyOpen, setBuyOpen] = useState(false);
  const { cta: copy } = useLandingContent();

  return (
    <section className="exp-cta" aria-labelledby="cta-heading">
      <BuyModal open={buyOpen} onOpenChange={setBuyOpen} />

      <div className="exp-cta-inner">
        <motion.h2
          id="cta-heading"
          className="exp-cta-title"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <span className="block">{copy.titleLine1}</span>
          <span className="block">{copy.titleLine2}</span>
        </motion.h2>

        <motion.div
          className="exp-cta-actions"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.55, delay: 0.08, ease: EASE }}
        >
          <TrialButton className="exp-cta-primary">{copy.primary}</TrialButton>
          <Button
            type="button"
            variant="outline"
            className="exp-cta-secondary"
            onClick={() => setBuyOpen(true)}
          >
            {copy.buy}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
