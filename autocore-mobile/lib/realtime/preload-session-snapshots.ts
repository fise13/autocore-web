import { queryClient } from '@/lib/query-client';
import { readRealtimeSnapshotSync } from '@/lib/realtime/snapshot-cache';
import {
  sessionBootstrapQueryKeys,
  sessionInteractiveQueryKeys,
} from '@/lib/realtime/session-bootstrap-keys';
import { markStartup } from '@/lib/performance/startup-tracer';

function hydrateOne(queryKey: readonly unknown[]): boolean {
  if (queryClient.getQueryData(queryKey) !== undefined) {
    return false;
  }
  const cached = readRealtimeSnapshotSync<unknown>(queryKey);
  if (cached === null) return false;
  queryClient.setQueryData(queryKey, cached);
  return true;
}

/**
 * Sync-hydrate only the light keys needed for first paint.
 * Heavy catalogs (motors / ops / inventory) must NOT run on the press frame —
 * they blocked RN taps for seconds while NativeTabs stayed live.
 */
export function preloadSessionSnapshots(companyId: string, uid: string | null): number {
  let hydrated = 0;
  for (const queryKey of sessionInteractiveQueryKeys(companyId)) {
    if (hydrateOne(queryKey)) hydrated += 1;
  }
  if (hydrated > 0) {
    markStartup('snapshots_preloaded');
  }
  return hydrated;
}

/**
 * Chunk remaining bootstrap catalogs across macrotasks so Pressable stays live.
 */
export function preloadSessionSnapshotsChunked(companyId: string, uid: string | null): void {
  const keys = sessionBootstrapQueryKeys(companyId, uid);
  let index = 0;
  let hydrated = 0;

  const step = () => {
    if (index >= keys.length) {
      if (hydrated > 0) {
        markStartup('snapshots_preloaded');
      }
      return;
    }

    const queryKey = keys[index];
    index += 1;
    if (hydrateOne(queryKey)) hydrated += 1;

    setTimeout(step, 0);
  };

  setTimeout(step, 0);
}
