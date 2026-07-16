"use client";

import { useRef, useState } from "react";
import {
  ClipboardList,
  LayoutDashboard,
  Smartphone,
  Wrench,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { productContent } from "@/components/marketing/product/content/product-content";
import { useSectionPin } from "@/components/marketing/experience/motion/use-section-pin";
import { cn } from "@/lib/utils";

const copy = productContent.sections.find((section) => section.id === "workday")!;
const EASE = [0.16, 1, 0.3, 1] as const;

const ROLE_ICONS = [LayoutDashboard, Smartphone, Wrench, ClipboardList] as const;

export function ProductWorkdayScroll() {
  const reduced = useReducedMotion();
  const pinRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useSectionPin(pinRef, pinRef, {
    enabled: !reduced,
    end: "+=140%",
    onUpdate: setProgress,
  });

  const activeIndex = reduced
    ? copy.workflow.length - 1
    : Math.min(copy.workflow.length - 1, Math.floor(progress * copy.workflow.length));

  const activeStep = copy.workflow[activeIndex]!;
  const ActiveIcon = ROLE_ICONS[activeIndex] ?? LayoutDashboard;

  return (
    <section id="workday" className="product-workday-section scroll-mt-28" aria-labelledby="workday-heading">
      <div ref={pinRef} className="product-workday-pin">
        <div className="exp-section-inner">
          <motion.div
            className="product-workday-header"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <p className="product-story-chapter" aria-hidden>
              {copy.chapter}
            </p>
            <h2 id="workday-heading" className="exp-display product-story-title">
              {copy.title}
            </h2>
            <p className="product-story-narrative">{copy.narrative}</p>
          </motion.div>

          <div className="product-workday-body">
            <div className="product-workday-roles">
              {copy.workflow.map((step, index) => {
                const Icon = ROLE_ICONS[index] ?? LayoutDashboard;
                const isActive = index === activeIndex;
                const isPast = index < activeIndex;
                return (
                  <div
                    key={step.label}
                    className={cn(
                      "product-workday-role",
                      isActive && "is-active",
                      isPast && "is-past",
                    )}
                  >
                    <span className="product-workday-role-icon" aria-hidden>
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="product-workday-role-label">{step.label}</p>
                      {step.detail ? (
                        <p className="product-workday-role-detail">{step.detail}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="product-workday-stage">
              <div className="product-workday-stage-glow" aria-hidden />
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep.label}
                  className="product-workday-focus"
                  initial={reduced ? false : { opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0, y: -10, scale: 0.99 }}
                  transition={{ duration: 0.38, ease: EASE }}
                >
                  <span className="product-workday-focus-icon" aria-hidden>
                    <ActiveIcon className="size-6" />
                  </span>
                  <p className="product-workday-focus-label">{activeStep.label}</p>
                  {activeStep.detail ? (
                    <p className="product-workday-focus-detail">{activeStep.detail}</p>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>

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
