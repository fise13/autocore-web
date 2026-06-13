"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  collectTierSignals,
  detectPerformanceTier,
  refinePerformanceTier,
  sampleFrameRate,
} from "@/lib/performance/detect-tier";
import {
  PERFORMANCE_TIER_ATTR,
  type PerformanceTier,
} from "@/lib/performance/performance-tier";

type PerformanceTierContextValue = {
  tier: PerformanceTier;
  prefersReducedMotion: boolean;
  scrollTriggerScrub: boolean;
  transitionBlurPx: number;
  backdropBlur: boolean;
};

const PerformanceTierContext = createContext<PerformanceTierContextValue | null>(null);

const TIER_CONFIG: Record<
  PerformanceTier,
  Pick<PerformanceTierContextValue, "scrollTriggerScrub" | "transitionBlurPx" | "backdropBlur">
> = {
  high: { scrollTriggerScrub: true, transitionBlurPx: 10, backdropBlur: true },
  balanced: { scrollTriggerScrub: true, transitionBlurPx: 6, backdropBlur: true },
  low: { scrollTriggerScrub: false, transitionBlurPx: 4, backdropBlur: false },
};

type PerformanceTierProviderProps = {
  children: ReactNode;
};

export function PerformanceTierProvider({ children }: PerformanceTierProviderProps) {
  const [tier, setTier] = useState<PerformanceTier>(() =>
    typeof window === "undefined" ? "high" : detectPerformanceTier(),
  );

  useEffect(() => {
    const initial = detectPerformanceTier();
    setTier(initial);
    document.documentElement.setAttribute(PERFORMANCE_TIER_ATTR, initial);

    let cancelled = false;
    void sampleFrameRate(2000).then((fps) => {
      if (cancelled) return;
      const refined = refinePerformanceTier(initial, fps);
      setTier(refined);
      document.documentElement.setAttribute(PERFORMANCE_TIER_ATTR, refined);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<PerformanceTierContextValue>(() => {
    const signals = collectTierSignals();
    return {
      tier,
      prefersReducedMotion: signals.reducedMotion,
      ...TIER_CONFIG[tier],
    };
  }, [tier]);

  return (
    <PerformanceTierContext.Provider value={value}>{children}</PerformanceTierContext.Provider>
  );
}

export function usePerformanceTier(): PerformanceTierContextValue {
  const context = useContext(PerformanceTierContext);
  if (!context) {
    return {
      tier: "high",
      prefersReducedMotion: false,
      scrollTriggerScrub: true,
      transitionBlurPx: 10,
      backdropBlur: true,
    };
  }
  return context;
}
