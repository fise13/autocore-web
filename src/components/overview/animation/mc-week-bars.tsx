"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";

import type { WeekBar } from "@/lib/my-earnings/compute-my-earnings";
import { cn } from "@/lib/utils";

const CHART_HEIGHT = 88;
const MIN_BAR_HEIGHT = 8;
const EMPTY_BAR_HEIGHT = 10;

type McWeekBarsProps = {
  bars: WeekBar[];
  delay?: number;
  className?: string;
  valueSuffix?: string;
};

function McWeekBarItem({
  bar,
  index,
  totalBars,
  maxValue,
  hasAnyData,
  isLatest,
  delay,
}: {
  bar: WeekBar;
  index: number;
  totalBars: number;
  maxValue: number;
  hasAnyData: boolean;
  isLatest: boolean;
  delay: number;
}) {
  const reducedMotion = useReducedMotion();
  const isEmptyStub = hasAnyData && bar.value === 0;
  const targetHeight = !hasAnyData
    ? EMPTY_BAR_HEIGHT
    : bar.value !== 0
      ? Math.max(MIN_BAR_HEIGHT, (Math.abs(bar.value) / maxValue) * CHART_HEIGHT)
      : EMPTY_BAR_HEIGHT;

  const mutedness = isLatest ? 1 : 0.28 + (index / Math.max(totalBars - 1, 1)) * 0.45;
  const hasAnimatedRef = useRef(false);

  const heightSpring = useSpring(reducedMotion ? targetHeight : EMPTY_BAR_HEIGHT, {
    stiffness: 120,
    damping: 18,
  });

  useEffect(() => {
    if (reducedMotion) {
      heightSpring.set(targetHeight);
      return;
    }
    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      const timer = window.setTimeout(() => {
        heightSpring.set(targetHeight);
      }, delay + index * 40);
      return () => window.clearTimeout(timer);
    }
    heightSpring.set(targetHeight);
  }, [delay, heightSpring, index, reducedMotion, targetHeight]);

  // Always brand blue — negative net days keep the same hue (height uses abs).
  const barClass = cn(
    "w-[78%] max-w-7 rounded-full transition-colors",
    !hasAnyData && "bg-primary/30",
    hasAnyData && isLatest && "bg-primary",
    hasAnyData && !isLatest && isEmptyStub && "bg-primary/20",
    hasAnyData && !isLatest && !isEmptyStub && "bg-primary/50",
  );

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div
        className="flex w-full items-end justify-center"
        style={{ height: CHART_HEIGHT, opacity: isLatest ? 1 : mutedness }}
      >
        <motion.div className={barClass} style={{ height: heightSpring }} />
      </div>
      <span className="text-micro leading-tight text-muted-foreground">{bar.label}</span>
    </div>
  );
}

export function McWeekBars({ bars, delay = 0, className }: McWeekBarsProps) {
  const maxValue = Math.max(...bars.map((bar) => Math.abs(bar.value)), 0);
  const hasAnyData = maxValue > 0;

  return (
    <div className={cn("flex items-end gap-1", className)}>
      {bars.map((bar, index) => (
        <McWeekBarItem
          key={`${bar.label}-${index}`}
          bar={bar}
          index={index}
          totalBars={bars.length}
          maxValue={maxValue}
          hasAnyData={hasAnyData}
          isLatest={index === bars.length - 1}
          delay={delay}
        />
      ))}
    </div>
  );
}
