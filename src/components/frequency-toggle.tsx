"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type FREQUENCY = "monthly" | "yearly";

type FrequencyToggleProps = Omit<ComponentProps<"div">, "children"> & {
  frequency: FREQUENCY;
  setFrequency: (frequency: FREQUENCY) => void;
  frequencies?: readonly FREQUENCY[];
  labels?: Partial<Record<FREQUENCY, string>>;
  layoutId?: string;
};

export function FrequencyToggle({
  frequency,
  setFrequency,
  frequencies = ["monthly", "yearly"],
  labels,
  layoutId = "frequency",
  className,
  ...props
}: FrequencyToggleProps) {
  const reduced = useReducedMotion();

  return (
    <div
      className={cn("mx-auto flex w-fit rounded-xl border bg-card p-1 shadow-xs", className)}
      {...props}
    >
      {frequencies.map((freq) => {
        const active = frequency === freq;
        const label = labels?.[freq] ?? freq;
        return (
          <button
            className={cn("relative px-4 py-1 text-sm", !labels?.[freq] && "capitalize")}
            key={freq}
            onClick={() => setFrequency(freq)}
            type="button"
            aria-pressed={active}
          >
            <span className="relative z-10">{label}</span>
            {active ? (
              reduced ? (
                <span className="pointer-events-none absolute inset-0 rounded-xl bg-muted" />
              ) : (
                <motion.span
                  className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-background mix-blend-difference dark:bg-foreground"
                  layoutId={layoutId}
                  transition={{ type: "spring", duration: 0.4 }}
                />
              )
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
