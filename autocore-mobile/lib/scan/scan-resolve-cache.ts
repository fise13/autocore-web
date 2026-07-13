import type { MobileScanResolveResult } from '@/types/inventory';

type CacheEntry = {
  expiresAt: number;
  result: MobileScanResolveResult;
};

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 200;

function cacheKey(barcode: string): string {
  return barcode.trim().toLowerCase();
}

export function readScanResolveCache(barcode: string): MobileScanResolveResult | null {
  const key = cacheKey(barcode);
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    CACHE.delete(key);
    return null;
  }
  return entry.result;
}

export function writeScanResolveCache(barcode: string, result: MobileScanResolveResult): void {
  const key = cacheKey(barcode);
  if (CACHE.size >= MAX_ENTRIES) {
    const first = CACHE.keys().next().value;
    if (first) CACHE.delete(first);
  }
  CACHE.set(key, { expiresAt: Date.now() + TTL_MS, result });
}

export function clearScanResolveCache(): void {
  CACHE.clear();
}
