"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";

type UseLiveSequenceOptions = {
  intervalMs?: number;
  paused?: boolean;
  loop?: boolean;
  initialIndex?: number;
};

export function useLiveSequence<T extends string>(
  steps: readonly T[],
  {
    intervalMs = 2400,
    paused = false,
    loop = true,
    initialIndex = 0,
  }: UseLiveSequenceOptions = {},
) {
  const reduced = usePrefersReducedMotion();
  const finalIndex = Math.max(0, steps.length - 1);
  const [index, setIndex] = useState(reduced ? finalIndex : initialIndex);
  const step = steps[index] ?? steps[0];
  const progress = steps.length > 1 ? index / finalIndex : 1;

  useEffect(() => {
    if (reduced) {
      setIndex(finalIndex);
    }
  }, [reduced, finalIndex]);

  useEffect(() => {
    if (reduced || paused || steps.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => {
        const next = current + 1;
        if (next < steps.length) return next;
        return loop ? 0 : current;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [reduced, intervalMs, loop, paused, steps, finalIndex]);

  return { step, index, progress, setIndex };
}
