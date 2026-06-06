"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type ImportProgressBarProps = {
  percent: number;
  message?: string;
  className?: string;
  compact?: boolean;
};

export function ImportProgressBar({
  percent,
  message,
  className,
  compact = false,
}: ImportProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-full bg-muted",
          compact ? "h-1.5" : "h-2",
        )}
      >
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${clamped}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
      {message && !compact ? (
        <p className="text-xs text-muted-foreground motion-safe:animate-autocore-fade-in motion-reduce:animate-none">
          {message}
        </p>
      ) : null}
    </div>
  );
}
