"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RefObject, useEffect } from "react";

import { usePerformanceTier } from "@/components/providers/performance-tier-provider";

gsap.registerPlugin(ScrollTrigger);

type UseSectionPinOptions = {
  pin?: boolean;
  scrub?: boolean | number;
  start?: string;
  end?: string;
  onUpdate?: (progress: number) => void;
  enabled?: boolean;
};

export function useSectionPin(
  sectionRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  {
    pin = true,
    scrub = true,
    start = "top top",
    end = "+=120%",
    onUpdate,
    enabled = true,
  }: UseSectionPinOptions = {},
) {
  const { scrollTriggerScrub, prefersReducedMotion } = usePerformanceTier();

  useEffect(() => {
    if (!enabled || prefersReducedMotion) return;
    const section = sectionRef.current;
    const trigger = triggerRef.current;
    if (!section || !trigger) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger,
        start,
        end,
        pin: pin ? section : false,
        scrub: scrollTriggerScrub ? scrub : false,
        anticipatePin: 1,
        onUpdate: (self) => onUpdate?.(self.progress),
      });
    }, section);

    return () => ctx.revert();
  }, [
    enabled,
    end,
    onUpdate,
    pin,
    prefersReducedMotion,
    scrollTriggerScrub,
    scrub,
    sectionRef,
    start,
    triggerRef,
  ]);
}
