import { resolveRouteCacheKey } from "@/components/layout/dashboard-route-cache";

const visitedKeys = new Set<string>();

export function registerRouteCacheKey(cacheKey: string): void {
  visitedKeys.add(cacheKey);
}

export function unregisterRouteCacheKey(cacheKey: string): void {
  visitedKeys.delete(cacheKey);
}

export function getVisitedRouteCacheKeys(): ReadonlySet<string> {
  return visitedKeys;
}

export function isRouteCacheHit(pathname: string): boolean {
  const key = resolveRouteCacheKey(pathname);
  return key !== null && visitedKeys.has(key);
}

export function isInstantCacheNavigation(fromPathname: string, toPathname: string): boolean {
  const fromKey = resolveRouteCacheKey(fromPathname);
  const toKey = resolveRouteCacheKey(toPathname);
  if (!fromKey || !toKey) return false;
  // Both endpoints must have been visited before this navigation starts.
  return visitedKeys.has(fromKey) && visitedKeys.has(toKey);
}
