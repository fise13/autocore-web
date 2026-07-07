"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useSpring } from "framer-motion";

import { cn } from "@/lib/utils";

export type McAnimatedValueFormat = "integer" | "currency";

type McAnimatedValueProps = {
  value: number;
  format?: McAnimatedValueFormat;
  suffix?: string;
  className?: string;
};

function formatAnimatedValue(value: number, format: McAnimatedValueFormat): string {
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safe);
  if (format === "currency") {
    return rounded.toLocaleString("ru-RU");
  }
  return rounded.toLocaleString("ru-RU");
}

export function McAnimatedValue({
  value,
  format = "integer",
  suffix = "",
  className,
}: McAnimatedValueProps) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const spring = useSpring(reducedMotion ? value : 0, { stiffness: 90, damping: 22 });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useMotionValueEvent(spring, "change", (latest) => {
    if (ref.current) {
      ref.current.textContent = `${formatAnimatedValue(latest, format)}${suffix}`;
    }
  });

  if (reducedMotion) {
    return (
      <span className={cn("tabular-nums", className)}>
        {formatAnimatedValue(value, format)}
        {suffix}
      </span>
    );
  }

  return (
    <motion.span
      ref={ref}
      className={cn("tabular-nums", className)}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {formatAnimatedValue(0, format)}
      {suffix}
    </motion.span>
  );
}
