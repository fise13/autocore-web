"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { usePerformanceTier } from "@/components/providers/performance-tier-provider";
import { sidebarBlockEnterTransition } from "@/lib/motion/sidebar-nav-motion";

type SidebarAnimatedSectionProps = {
  blockIndex: number;
  children: ReactNode;
};

export function SidebarAnimatedSection({ blockIndex, children }: SidebarAnimatedSectionProps) {
  const reduceMotion = useReducedMotion();
  const { tier } = usePerformanceTier();

  if (reduceMotion || tier === "low") {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={sidebarBlockEnterTransition(blockIndex)}
    >
      {children}
    </motion.div>
  );
}
