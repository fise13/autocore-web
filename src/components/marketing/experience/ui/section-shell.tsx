"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type SectionRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

export function SectionReveal({ children, className, delay = 0, y = 16 }: SectionRevealProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function SectionShell({
  children,
  className,
  id,
  ariaLabelledby,
  backdrop,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  ariaLabelledby?: string;
  backdrop?: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn("exp-section", backdrop && "mkt-has-world-map", className)}
      aria-labelledby={ariaLabelledby}
    >
      {backdrop}
      <div className="exp-section-inner">{children}</div>
    </section>
  );
}
