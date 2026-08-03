import type { QueryClient } from '@tanstack/react-query';

type PendingApply = {
  queryClient: QueryClient;
  queryKey: readonly unknown[];
  data: unknown;
};

const pendingByKey = new Map<string, PendingApply>();
let drainTimer: ReturnType<typeof setTimeout> | null = null;
let draining = false;
let lastCatalogApplyAt = 0;
let seenCatalogApply = false;

/** Arrays above this always apply off the snapshot/press frame. */
const DEFER_ARRAY_MIN = 20;

function keyOf(queryKey: readonly unknown[]): string {
  return queryKey.map(String).join('|');
}

function shouldDeferApply(data: unknown): boolean {
  return Array.isArray(data) && data.length >= DEFER_ARRAY_MIN;
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
  }, 32);
}

export function setShellRevealed(revealed: boolean): void {
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
  if (!shouldDeferApply(data)) {
    pendingByKey.delete(keyOf(queryKey));
    applyNow(queryClient, queryKey, data);
    return;
  }

  pendingByKey.set(keyOf(queryKey), { queryClient, queryKey, data });
  scheduleDrain();
}

/** Drain pending applies one-by-one — never dump the whole catalog on one frame. */
export function flushScheduledQueryDataApplies(): void {
  if (pendingByKey.size === 0) return;
  scheduleDrain();
}

export function clearScheduledQueryDataApplies(): void {
  pendingByKey.clear();
  if (drainTimer) {
    clearTimeout(drainTimer);
    drainTimer = null;
  }
  draining = false;
}
