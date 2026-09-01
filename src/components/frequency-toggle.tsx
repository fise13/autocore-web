"use client";

import { useReducedMotion } from "motion/react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type FREQUENCY = "monthly" | "yearly";

type FrequencyToggleProps = Omit<ComponentProps<"div">, "children"> & {
  frequency: FREQUENCY;
  setFrequency: (frequency: FREQUENCY) => void;
  frequencies?: readonly FREQUENCY[];
  labels?: Partial<Record<FREQUENCY, string>>;
  /** Kept so existing call sites do not break; the pill uses CSS transform instead. */
  layoutId?: string;
};

export function FrequencyToggle({
  frequency,
  setFrequency,
  frequencies = ["monthly", "yearly"],
  labels,
  layoutId: _layoutId,
  className,
  ...props
}: FrequencyToggleProps) {
  const reduced = useReducedMotion();
  const activeIndex = Math.max(0, frequencies.indexOf(frequency));

  return (
    <div
      className={cn("relative mx-auto flex w-fit rounded-xl border p-1", className)}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1 bottom-1 left-1 rounded-lg bg-muted",
          !reduced && "transition-transform duration-200 ease-out will-change-transform",
        )}
        style={{
          width: `calc((100% - 0.5rem) / ${frequencies.length})`,
          transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
        }}
      />
      {frequencies.map((freq) => {
        const active = frequency === freq;
        const label = labels?.[freq] ?? freq;
        return (
          <button
            className={cn(
              "relative z-10 px-4 py-1 text-sm",
              !labels?.[freq] && "capitalize",
              active ? "text-foreground" : "text-muted-foreground",
            )}
            key={freq}
            onClick={() => {
              if (freq !== frequency) setFrequency(freq);
            }}
            type="button"
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
