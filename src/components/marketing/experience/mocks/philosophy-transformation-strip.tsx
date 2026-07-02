"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { landingContent } from "@/components/marketing/experience/content/landing-content";
import { cn } from "@/lib/utils";

const copy = landingContent.philosophy;
const EASE = [0.16, 1, 0.3, 1] as const;

export function PhilosophyTransformationStrip({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={cn("exp-philosophy-transform", className)}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-8">
        <div>
          <p className="text-[11px] text-muted-foreground">Было</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {copy.before.map((item) => (
              <li
                key={item}
                className="rounded-full border border-border/40 px-3 py-1 text-xs text-muted-foreground line-through decoration-border/70"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-center text-muted-foreground/50" aria-hidden>
          <ArrowRight className="size-4 max-md:rotate-90" />
        </div>

        <div>
          <p className="text-[11px] text-muted-foreground">Стало</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {copy.after.map((item) => (
              <li
                key={item}
                className="rounded-full border border-border/50 px-3 py-1 text-xs text-foreground/80"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
