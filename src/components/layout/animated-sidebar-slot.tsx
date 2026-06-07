"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import {
  dashboardTopBarSlotVariants,
  dashboardTopBarTransition,
} from "@/components/layout/dashboard-top-bar-motion";

type AnimatedSidebarSlotProps = {
  slotKey: string;
  children: ReactNode | null;
  className?: string;
};

export function AnimatedSidebarSlot({ slotKey, children, className }: AnimatedSidebarSlotProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    if (!children) return null;
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {children ? (
        <motion.div
          key={slotKey}
          className={className}
          variants={dashboardTopBarSlotVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={dashboardTopBarTransition}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
