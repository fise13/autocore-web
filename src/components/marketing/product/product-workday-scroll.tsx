"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { productContent } from "@/components/marketing/product/content/product-content";
import { ProductWorkflowRail } from "@/components/marketing/product/product-workflow-rail";
import { useSectionPin } from "@/components/marketing/experience/motion/use-section-pin";
import { cn } from "@/lib/utils";

const copy = productContent.sections.find((section) => section.id === "workday")!;
const EASE = [0.16, 1, 0.3, 1] as const;

export function ProductWorkdayScroll() {
  const reduced = useReducedMotion();
  const pinRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useSectionPin(pinRef, pinRef, {
    enabled: !reduced,
    end: "+=130%",
    onUpdate: setProgress,
  });

  const activeIndex = reduced
    ? copy.workflow.length - 1
    : Math.min(copy.workflow.length - 1, Math.floor(progress * copy.workflow.length));

  const activeStep = copy.workflow[activeIndex]!;

  return (
    <section id="workday" className="product-workday-section" aria-labelledby="workday-heading">
      <div ref={pinRef} className="product-workday-pin">
        <div className="exp-section-inner">
          <motion.div
            className="product-workday-header"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <h2 id="workday-heading" className="exp-display product-story-title">
              {copy.title}
            </h2>
            <p className="product-story-narrative">{copy.narrative}</p>
          </motion.div>

          <div className="product-workday-body">
            <ProductWorkflowRail steps={copy.workflow} activeIndex={activeIndex} />

            <motion.div
              key={activeStep.label}
              className="product-workday-focus"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <p className="product-workday-focus-label">{activeStep.label}</p>
              {activeStep.detail ? (
                <p className="product-workday-focus-detail">{activeStep.detail}</p>
              ) : null}
            </motion.div>

            <div className="product-workday-progress" aria-hidden>
              {copy.workflow.map((step, index) => (
                <span
                  key={step.label}
                  className={cn("product-workday-progress-segment", index <= activeIndex && "is-active")}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
