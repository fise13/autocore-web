import type { QueryClient } from '@tanstack/react-query';

type PendingApply = {
  queryClient: QueryClient;
  queryKey: readonly unknown[];
  data: unknown;
};

const pendingByKey = new Map<string, PendingApply>();
let drainTimer: ReturnType<typeof setTimeout> | null = null;
let draining = false;
let shellRevealed = false;
let lastCatalogApplyAt = 0;
let seenCatalogApply = false;

function keyOf(queryKey: readonly unknown[]): string {
  return queryKey.map(String).join('|');
}

function isLargeCatalog(data: unknown): boolean {
  return Array.isArray(data) && data.length > 80;
}

function noteCatalogApply(): void {
  lastCatalogApplyAt = Date.now();
  seenCatalogApply = true;
}

function applyNow(queryClient: QueryClient, queryKey: readonly unknown[], data: unknown): void {
  try {
    queryClient.setQueryData(queryKey, data);
  } catch {
    // ignore
  }
  noteCatalogApply();
}

function scheduleDrain(): void {
  if (draining || drainTimer) return;
  drainTimer = setTimeout(() => {
    drainTimer = null;
    drainOne();
  }, 16);
}

function drainOne(): void {
  const next = pendingByKey.values().next();
  if (next.done) {
    draining = false;
    return;
  }

  draining = true;
  const job = next.value;
  pendingByKey.delete(keyOf(job.queryKey));
  applyNow(job.queryClient, job.queryKey, job.data);

  if (pendingByKey.size === 0) {
    draining = false;
    return;
  }

  drainTimer = setTimeout(() => {
    drainTimer = null;
    drainOne();
  }, 24);
}

export function setShellRevealed(revealed: boolean): void {
  shellRevealed = revealed;
  if (!revealed) {
    seenCatalogApply = false;
    lastCatalogApplyAt = 0;
  }
}

export function getPendingQueryDataApplyCount(): number {
  return pendingByKey.size;
}

export function hasSeenCatalogApply(): boolean {
  return seenCatalogApply;
}

/** Start the quiet clock when listeners are ready from cache without a fresh apply. */
export function markCatalogApplyNow(): void {
  lastCatalogApplyAt = Date.now();
  seenCatalogApply = true;
}

export function getMsSinceLastCatalogApply(): number {
  if (lastCatalogApplyAt === 0) return 0;
  return Date.now() - lastCatalogApplyAt;
}

export function scheduleQueryDataApply(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  data: unknown,
): void {
  if (!shellRevealed || !isLargeCatalog(data)) {
    pendingByKey.delete(keyOf(queryKey));
    applyNow(queryClient, queryKey, data);
    return;
  }

  pendingByKey.set(keyOf(queryKey), { queryClient, queryKey, data });
  scheduleDrain();
}

export function flushScheduledQueryDataApplies(): void {
  if (drainTimer) {
    clearTimeout(drainTimer);
    drainTimer = null;
  }
  draining = false;

  const batch = [...pendingByKey.values()];
  pendingByKey.clear();
  for (const job of batch) {
    applyNow(job.queryClient, job.queryKey, job.data);
  }
}

export function clearScheduledQueryDataApplies(): void {
  pendingByKey.clear();
  if (drainTimer) {
    clearTimeout(drainTimer);
    drainTimer = null;
  }
  draining = false;
}
