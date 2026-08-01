import { detach as detachSubscriptions } from '@/lib/subscriptions/subscription-manager';
import { resetAppShellReady } from '@/lib/app-shell-ready';
import { clearRealtimeSubscriptions } from '@/lib/realtime/subscription-registry';
import { clearSessionSnapshot } from '@/lib/session/session-snapshot-cache';
import { mmkvQueryPersister, rotateQueryPersistBuster } from '@/lib/storage/mmkv-query-persister';
import { clearRecentQueriesCache } from '@/lib/search/recent-queries';

export async function clearLocalSessionCaches(): Promise<void> {
  resetAppShellReady();
  clearRealtimeSubscriptions();
  // Tears down the store connection, the entitlement registry and the cache —
  // entitlement must never survive into the next session.
  await detachSubscriptions();
  rotateQueryPersistBuster();
  await mmkvQueryPersister.removeClient();
  await clearSessionSnapshot();
  clearRecentQueriesCache();
}
