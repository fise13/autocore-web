"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RefObject } from "react";

import { splitText } from "@/components/marketing/motion/split-text";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";

gsap.registerPlugin(ScrollTrigger);

type RevealOptions = {
  y?: number;
  duration?: number;
  stagger?: number;
  start?: string;
  delay?: number;
};

export function useGsapReveal(
  ref: RefObject<HTMLElement | null>,
  selector: string,
  options?: RevealOptions,
) {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || reduced) return;

      const targets = root.querySelectorAll<HTMLElement>(selector);
      if (!targets.length) return;

      gsap.set(targets, { opacity: 0, y: options?.y ?? 28 });

      targets.forEach((el, i) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: options?.duration ?? 0.75,
          ease: "power2.out",
          delay: (options?.delay ?? 0) + i * (options?.stagger ?? 0.08),
          scrollTrigger: {
            trigger: el,
            start: options?.start ?? "top 88%",
            once: true,
          },
        });
      });
    },
    { scope: ref, dependencies: [reduced, selector] },
  );
}

export function useGsapSplitHeading(
  ref: RefObject<HTMLElement | null>,
  selector: string,
) {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || reduced) return;

      const headings = root.querySelectorAll<HTMLElement>(selector);
      const splits: Array<{ revert: () => void }> = [];

      headings.forEach((heading) => {
        const split = splitText(heading, { lines: true, words: true });
        splits.push(split);

        const lineInners = Array.from(heading.querySelectorAll<HTMLElement>("[data-line-inner]"));
        const animateTargets = lineInners.length ? lineInners : [heading];

        gsap.set(animateTargets, { opacity: 0, y: lineInners.length ? "110%" : 28 });

        gsap.to(animateTargets, {
          opacity: 1,
          y: lineInners.length ? "0%" : 0,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: heading,
            start: "top 85%",
            once: true,
          },
        });
      });

      return () => splits.forEach((s) => s.revert());
    },
    { scope: ref, dependencies: [reduced, selector] },
  );
}

/** Hero-only: animate lines on mount (no ScrollTrigger). */
export function useGsapSplitHero(
  ref: RefObject<HTMLElement | null>,
  selector: string,
) {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || reduced) return;

      const lines = root.querySelectorAll<HTMLElement>(selector);
      const targets = Array.from(lines);

      gsap.set(targets, { opacity: 0, y: 28 });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.85,
        ease: "power3.out",
        stagger: 0.14,
        delay: 0.1,
      });
    },
    { scope: ref, dependencies: [reduced, selector] },
  );
}
