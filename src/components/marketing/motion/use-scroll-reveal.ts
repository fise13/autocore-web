"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RefObject } from "react";

import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";

type ScrollRevealOptions = {
  scope: RefObject<HTMLElement | HTMLDivElement | null>;
  selector?: string;
  y?: number;
  stagger?: number;
  start?: string;
};

export function useScrollReveal({
  scope,
  selector = "[data-reveal]",
  y = 28,
  stagger = 0.08,
  start = "top 82%",
}: ScrollRevealOptions) {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (!scope.current || reduced) return;
      const targets = scope.current.querySelectorAll(selector);
      if (!targets.length) return;

      gsap.from(targets, {
        opacity: 0,
        y,
        duration: 0.65,
        stagger,
        ease: "power3.out",
        scrollTrigger: {
          trigger: scope.current,
          start,
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope, dependencies: [reduced, selector, y, stagger, start] },
  );
}
