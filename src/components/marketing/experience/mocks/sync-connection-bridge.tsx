"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { PlatformSyncStep } from "@/components/marketing/experience/motion/platform-sync-steps";
import { isPlatformStepAtLeast } from "@/components/marketing/experience/motion/platform-sync-steps";
import { cn } from "@/lib/utils";

type SyncConnectionBridgeProps = {
  step: PlatformSyncStep;
  pulseKey: number;
  className?: string;
};

const pulseDotClass =
  "absolute size-1.5 rounded-full bg-primary shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_50%,transparent)]";

export function SyncConnectionBridge({ step, pulseKey, className }: SyncConnectionBridgeProps) {
  const reduced = useReducedMotion();
  const active = isPlatformStepAtLeast(step, "detect");
  const shouldPulse = active && (step === "detect" || step === "sync");
  const duration = step === "detect" ? 0.9 : 0.7;

  const pulseMotion = reduced
    ? false
    : {
        initial: { opacity: 0, left: "4%", top: "50%", y: "-50%" },
        animate: { opacity: [0, 1, 1, 0], left: ["4%", "92%", "92%", "92%"] },
        transition: { duration, ease: [0.16, 1, 0.3, 1] as const, times: [0, 0.12, 0.88, 1] },
      };

  const pulseMotionVertical = reduced
    ? false
    : {
        initial: { opacity: 0, top: "4%", left: "50%", x: "-50%" },
        animate: { opacity: [0, 1, 1, 0], top: ["4%", "92%", "92%", "92%"] },
        transition: { duration, ease: [0.16, 1, 0.3, 1] as const, times: [0, 0.12, 0.88, 1] },
      };

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        "max-sm:order-2 max-sm:h-8 max-sm:w-full",
        "sm:min-h-[200px] sm:w-8 lg:w-10",
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-full bg-border max-sm:h-px max-sm:w-full sm:hidden",
          active && "bg-primary/20",
        )}
      >
        <AnimatePresence>
          {shouldPulse ? (
            <motion.span key={`h-${pulseKey}`} className={cn(pulseDotClass, "sm:hidden")} {...pulseMotion} />
          ) : null}
        </AnimatePresence>
      </div>

      <div
        className={cn(
          "relative hidden overflow-hidden rounded-full bg-border sm:block sm:h-full sm:w-px",
          active && "bg-primary/20",
        )}
      >
        <AnimatePresence>
          {shouldPulse ? (
            <motion.span key={`v-${pulseKey}`} className={cn(pulseDotClass, "hidden sm:block")} {...pulseMotionVertical} />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
