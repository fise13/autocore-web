import { queryClient } from '@/lib/query-client';
import { readRealtimeSnapshotSync } from '@/lib/realtime/snapshot-cache';
import { sessionBootstrapQueryKeys } from '@/lib/realtime/session-bootstrap-keys';
import { seedRealtimeRegistryEntry } from '@/lib/realtime/subscription-registry';
import { markStartup } from '@/lib/performance/startup-tracer';

/** Sync-hydrate session realtime snapshots into registry + React Query. */
export function preloadSessionSnapshots(companyId: string, uid: string | null): number {
  let hydrated = 0;
  const keys = sessionBootstrapQueryKeys(companyId, uid);

  for (const queryKey of keys) {
    const cached = readRealtimeSnapshotSync<unknown>(queryKey);
    if (cached === null) continue;

    seedRealtimeRegistryEntry(queryKey, cached);
    queryClient.setQueryData(queryKey, cached);
    hydrated += 1;
  }

  if (hydrated > 0) {
    markStartup('snapshots_preloaded');
  }

  return hydrated;
}
