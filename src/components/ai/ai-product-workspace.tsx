"use client";

import { motion, useReducedMotion } from "motion/react";

import { AIWorkspace } from "@/components/ai/ai-workspace";

/**
 * Full-bleed Core product surface on `/ai`.
 *
 * AutoCore sidebar stays; dashboard top bar is hidden by the shell.
 * Enter motion makes the route feel like opening a separate product.
 */
export function AIProductWorkspace() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="flex h-full min-h-0 flex-1 flex-col bg-background"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
      }
    >
      <AIWorkspace />
    </motion.div>
  );
}
