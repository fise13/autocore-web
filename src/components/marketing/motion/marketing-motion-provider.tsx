"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ReactNode, useEffect } from "react";

import { usePerformanceTier } from "@/components/providers/performance-tier-provider";

gsap.registerPlugin(ScrollTrigger);

type MarketingMotionProviderProps = {
  children: ReactNode;
};

export function MarketingMotionProvider({ children }: MarketingMotionProviderProps) {
  const { scrollTriggerScrub } = usePerformanceTier();

  useEffect(() => {
    ScrollTrigger.config({ limitCallbacks: true });
    document.documentElement.style.setProperty(
      "--scroll-trigger-scrub",
      scrollTriggerScrub ? "1" : "0",
    );
  }, [scrollTriggerScrub]);

  useEffect(() => {
    let timeoutId: number | undefined;
    const refresh = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    };
    window.addEventListener("resize", refresh);
    return () => {
      window.removeEventListener("resize", refresh);
      window.clearTimeout(timeoutId);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return <>{children}</>;
}
