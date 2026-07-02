"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { PlatformSyncStep } from "@/components/marketing/experience/motion/platform-sync-steps";
import { isPlatformStepAtLeast } from "@/components/marketing/experience/motion/platform-sync-steps";
import { cn } from "@/lib/utils";

type DeviceSyncPulseProps = {
  step: PlatformSyncStep;
  pulseKey: number;
  className?: string;
};

export function DeviceSyncPulse({ step, pulseKey, className }: DeviceSyncPulseProps) {
  const reduced = useReducedMotion();
  const active = isPlatformStepAtLeast(step, "detect");
  const shouldPulse = active && (step === "detect" || step === "save" || step === "sync");
  const duration = step === "detect" ? 1 : 0.85;

  const horizontalMotion = reduced
    ? false
    : {
        initial: { opacity: 0, left: "2%", top: "50%", y: "-50%", scale: 0.6 },
        animate: {
          opacity: [0, 1, 1, 0],
          left: ["2%", "96%", "96%", "96%"],
          scale: [0.6, 1, 1, 0.8],
        },
        transition: { duration, ease: [0.22, 1, 0.36, 1] as const, times: [0, 0.1, 0.85, 1] },
      };

  const verticalMotion = reduced
    ? false
    : {
        initial: { opacity: 0, top: "2%", left: "50%", x: "-50%", scale: 0.6 },
        animate: {
          opacity: [0, 1, 1, 0],
          top: ["2%", "96%", "96%", "96%"],
          scale: [0.6, 1, 1, 0.8],
        },
        transition: { duration, ease: [0.22, 1, 0.36, 1] as const, times: [0, 0.1, 0.85, 1] },
      };

  return (
    <div className={cn("device-sync-pulse", className)} aria-hidden>
      <div className={cn("device-sync-pulse-track device-sync-pulse-track-h lg:hidden", active && "is-active")}>
        <AnimatePresence>
          {shouldPulse ? (
            <motion.span key={`h-${pulseKey}`} className="device-sync-pulse-dot" {...verticalMotion} />
          ) : null}
        </AnimatePresence>
      </div>
      <div className={cn("device-sync-pulse-track device-sync-pulse-track-v hidden lg:block", active && "is-active")}>
        <AnimatePresence>
          {shouldPulse ? (
            <motion.span key={`v-${pulseKey}`} className="device-sync-pulse-dot" {...horizontalMotion} />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
