"use client";

import { animate, createScope, stagger } from "animejs";
import { RefObject, useEffect } from "react";

type AnimeRevealOptions = {
  scope: RefObject<HTMLElement | null>;
  selector?: string;
  delay?: number;
};

export function useAnimeReveal({
  scope,
  selector = "[data-anime-reveal]",
  delay = 0,
}: AnimeRevealOptions) {
  useEffect(() => {
    const root = scope.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (!targets.length) return;

    if (reduceMotion) {
      targets.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    targets.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
    });

    let animeScope: ReturnType<typeof createScope> | null = null;
    let played = false;

    const play = () => {
      if (played) return;
      played = true;
      animeScope = createScope({ root });
      animeScope.add(() => {
        animate(targets, {
          opacity: [0, 1],
          translateY: [24, 0],
          ease: "outExpo",
          duration: 900,
          delay: stagger(80, { start: delay }),
        });
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          play();
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
      animeScope?.revert();
    };
  }, [scope, selector, delay]);
}
