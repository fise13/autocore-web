"use client";

import { motion, useReducedMotion } from "motion/react";

import type { ProductWorkflowStep } from "@/components/marketing/product/content/product-content";
import { cn } from "@/lib/utils";

type ProductWorkflowRailProps = {
  steps: readonly ProductWorkflowStep[];
  activeIndex: number;
  className?: string;
  orientation?: "horizontal" | "vertical";
};

export function ProductWorkflowRail({
  steps,
  activeIndex,
  className,
  orientation = "horizontal",
}: ProductWorkflowRailProps) {
  const reduced = useReducedMotion();
  const vertical = orientation === "vertical";

  return (
    <ol
      className={cn(
        "product-workflow-rail",
        vertical && "product-workflow-rail-vertical",
        className,
      )}
      aria-label="Шаги процесса"
    >
      {steps.map((step, index) => {
        const isPast = index < activeIndex;
        const isCurrent = index === activeIndex;

        return (
          <li
            key={step.label}
            className={cn(
              "product-workflow-rail-item",
              vertical && "product-workflow-rail-item-vertical",
              isPast && "is-past",
              isCurrent && "is-current",
            )}
          >
            <span className="product-workflow-rail-marker" aria-hidden>
              {isPast ? (
                <span className="product-workflow-rail-check" />
              ) : isCurrent && !reduced ? (
                <motion.span
                  className="product-workflow-rail-pulse"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.65, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : (
                <span className="product-workflow-rail-dot" />
              )}
            </span>
            <div className="product-workflow-rail-copy">
              <p className="product-workflow-rail-label">{step.label}</p>
              {step.detail ? (
                <p className="product-workflow-rail-detail">{step.detail}</p>
              ) : null}
            </div>
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  "product-workflow-rail-connector",
                  vertical && "product-workflow-rail-connector-vertical",
                  isPast && "is-past",
                )}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
