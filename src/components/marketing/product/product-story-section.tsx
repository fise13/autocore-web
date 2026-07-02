"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

import type { ProductWorkflowStep } from "@/components/marketing/product/content/product-content";
import { useLiveSequence } from "@/components/marketing/experience/motion/use-live-sequence";
import { ProductWorkflowRail } from "@/components/marketing/product/product-workflow-rail";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type ProductStorySectionProps = {
  id: string;
  title: string;
  narrative: string;
  workflow: readonly ProductWorkflowStep[];
  intervalMs: number;
  reverse?: boolean;
  wideMock?: boolean;
  children: ReactNode;
};

export function ProductStorySection({
  id,
  title,
  narrative,
  workflow,
  intervalMs,
  reverse = false,
  wideMock = false,
  children,
}: ProductStorySectionProps) {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { margin: "-20% 0px", amount: 0.25 });
  const stepIds = workflow.map((step) => step.label);
  const { index: activeIndex } = useLiveSequence(stepIds, {
    intervalMs,
    paused: !inView,
    loop: true,
  });
  const currentIndex = reduced ? workflow.length - 1 : activeIndex;

  return (
    <section
      ref={sectionRef}
      id={id}
      className="product-story-section"
      aria-labelledby={`${id}-heading`}
    >
      <div className="exp-section-inner">
        <div
          className={cn(
            "product-story-grid",
            reverse && "product-story-grid-reverse",
            wideMock && "product-story-grid-wide",
          )}
        >
          <motion.div
            className="product-story-copy"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <h2 id={`${id}-heading`} className="exp-display product-story-title">
              {title}
            </h2>
            <p className="product-story-narrative">{narrative}</p>
            <ProductWorkflowRail steps={workflow} activeIndex={currentIndex} className="mt-8" />
          </motion.div>

          <motion.div
            className="product-story-visual"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.62, delay: 0.08, ease: EASE }}
          >
            <div className="exp-mock-shelf p-3 sm:p-4">{children}</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
