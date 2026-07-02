"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { useLiveSequence } from "@/components/marketing/experience/motion/use-live-sequence";
import { LiveBadge } from "@/components/marketing/experience/ui/live-badge";
import { cn } from "@/lib/utils";

type WorkflowStep = {
  label: string;
  detail?: string;
};

type PhilosophyWorkflowPanelProps = {
  title: string;
  steps: readonly WorkflowStep[];
  intervalMs: number;
  initialIndex?: number;
  paused?: boolean;
  className?: string;
};

export function PhilosophyWorkflowPanel({
  title,
  steps,
  intervalMs,
  initialIndex = 0,
  paused = false,
  className,
}: PhilosophyWorkflowPanelProps) {
  const reduced = useReducedMotion();
  const stepIds = steps.map((step) => step.label) as readonly string[];
  const { index: activeIndex } = useLiveSequence(stepIds, {
    intervalMs,
    initialIndex,
    loop: true,
    paused,
  });
  const current = reduced ? steps.length - 1 : activeIndex;
  const isComplete = current === steps.length - 1;

  return (
    <article className={cn("exp-philosophy-workflow", className)}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <div className="flex min-h-6 min-w-[4.5rem] shrink-0 items-center justify-end">
          <div
            className={cn(
              "transition-opacity duration-300",
              isComplete ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={!isComplete}
          >
            <LiveBadge label="Live" />
          </div>
        </div>
      </div>

      <ol className="mt-5 flex flex-col">
        {steps.map((step, i) => {
          const isActive = i === current;
          const isPast = i < current;
          const isLast = i === steps.length - 1;

          return (
            <li key={step.label} className="relative flex gap-3">
              {!isLast ? (
                <span
                  className={cn(
                    "absolute top-6 left-[10px] w-px",
                    isPast ? "exp-philosophy-line-active" : "bg-border",
                  )}
                  style={{ height: "calc(100% - 0.25rem)" }}
                  aria-hidden
                />
              ) : null}

              <span
                className={cn(
                  "relative z-10 flex size-[22px] shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                  isActive && "border-primary bg-primary/10 shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_8%,transparent)]",
                  isPast && "border-primary/50 bg-primary/5",
                  !isActive && !isPast && "border-border bg-muted/20",
                )}
              >
                {isPast ? (
                  <Check className="size-3 text-primary" aria-hidden />
                ) : isActive ? (
                  <motion.span
                    className="size-2 rounded-full bg-primary"
                    animate={reduced ? undefined : { scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  />
                ) : (
                  <span className="size-1.5 rounded-full bg-border" aria-hidden />
                )}
              </span>

              <div className={cn("min-w-0 flex-1", !isLast && "pb-5")}>
                <p
                  className={cn(
                    "text-sm transition-colors duration-300",
                    isActive ? "font-medium text-foreground" : isPast ? "text-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </p>
                {step.detail ? (
                  <p
                    className={cn(
                      "mt-0.5 font-mono text-[11px] tabular-nums transition-colors duration-300",
                      isActive ? "text-muted-foreground" : "text-muted-foreground/70",
                    )}
                  >
                    {step.detail}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
