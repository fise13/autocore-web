"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type ProductWalkSectionProps = {
  id: string;
  title: string;
  line: string;
  question?: string;
  children: ReactNode;
  className?: string;
  surfaceClassName?: string;
};

/** One question. One real product screen. */
export function ProductWalkSection({
  id,
  title,
  line,
  question,
  children,
  className,
  surfaceClassName,
}: ProductWalkSectionProps) {
  const reduced = useReducedMotion();

  return (
    <section id={id} className={cn("product-walk-section scroll-mt-28", className)} aria-labelledby={`${id}-heading`}>
      <motion.div
        className="product-walk-copy"
        initial={reduced ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        {question ? <p className="product-walk-question">{question}</p> : null}
        <h2 id={`${id}-heading`} className="product-walk-title">
          {title}
        </h2>
        <p className="product-walk-line">{line}</p>
      </motion.div>

      <motion.div
        className={cn("product-walk-surface", surfaceClassName)}
        initial={reduced ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.85, delay: 0.06, ease: EASE }}
      >
        {children}
      </motion.div>
    </section>
  );
}
