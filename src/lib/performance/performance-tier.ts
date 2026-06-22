export type PerformanceTier = "high" | "balanced" | "low";

export const PERFORMANCE_TIER_ATTR = "data-perf-tier";

export const ROUTE_CACHE_MAX_PANELS: Record<PerformanceTier, number> = {
  high: 12,
  balanced: 8,
  low: 4,
};

export const PREFETCH_ROUTES_LOW_TIER = ["/", "/motors", "/work-orders"] as const;
