import type { PerformanceTier } from "@/lib/performance/performance-tier";

type TierSignals = {
  deviceMemory?: number;
  hardwareConcurrency: number;
  connectionType?: string;
  reducedMotion: boolean;
  measuredFps?: number;
};

function scoreTier(signals: TierSignals): PerformanceTier {
  let score = 0;

  if (signals.reducedMotion) score += 2;
  if (signals.deviceMemory !== undefined && signals.deviceMemory <= 4) score += 2;
  if (signals.hardwareConcurrency <= 4) score += 1;
  if (signals.connectionType === "slow-2g" || signals.connectionType === "2g") score += 2;
  if (signals.connectionType === "3g") score += 1;
  if (signals.measuredFps !== undefined && signals.measuredFps < 45) score += 2;
  else if (signals.measuredFps !== undefined && signals.measuredFps < 55) score += 1;

  if (score >= 4) return "low";
  if (score >= 2) return "balanced";
  return "high";
}

export function collectTierSignals(): TierSignals {
  if (typeof window === "undefined") {
    return { hardwareConcurrency: 8, reducedMotion: false };
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
  };

  return {
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency || 4,
    connectionType: nav.connection?.effectiveType,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

export function detectPerformanceTier(signals: TierSignals = collectTierSignals()): PerformanceTier {
  return scoreTier(signals);
}

export function sampleFrameRate(durationMs = 2000): Promise<number> {
  if (typeof window === "undefined") return Promise.resolve(60);

  return new Promise((resolve) => {
    const frames: number[] = [];
    let last = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      frames.push(now - last);
      last = now;
      if (now - frames[0]! < durationMs || frames.length === 1) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      cancelAnimationFrame(rafId);
      const avg = frames.reduce((sum, delta) => sum + delta, 0) / frames.length;
      resolve(Math.min(60, 1000 / Math.max(avg, 1)));
    };

    rafId = requestAnimationFrame(tick);
  });
}

export function refinePerformanceTier(
  initial: PerformanceTier,
  measuredFps: number,
): PerformanceTier {
  const signals = { ...collectTierSignals(), measuredFps };
  const refined = scoreTier(signals);
  const order: PerformanceTier[] = ["high", "balanced", "low"];
  const initialIdx = order.indexOf(initial);
  const refinedIdx = order.indexOf(refined);
  return order[Math.max(initialIdx, refinedIdx)]!;
}
