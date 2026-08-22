import { detach as detachSubscriptions } from '@/lib/subscriptions/subscription-manager';
import { clearHomeSnapshots } from '@/features/overview/home/lib/home-snapshot-store';
import { resetAppShellReady } from '@/lib/app-shell-ready';
import { clearRealtimeSubscriptions } from '@/lib/realtime/subscription-registry';
import { clearSessionSnapshot } from '@/lib/session/session-snapshot-cache';
import { mmkvQueryPersister, rotateQueryPersistBuster } from '@/lib/storage/mmkv-query-persister';
import { clearRecentQueriesCache } from '@/lib/search/recent-queries';

export async function clearLocalSessionCaches(): Promise<void> {
  resetAppShellReady();
  clearRealtimeSubscriptions();
  // The saved Home brief is local data like any other — "Clear cache" has to
  // actually clear it, or the button reports a size it did not free.
  clearHomeSnapshots();
  // Tears down the store connection, the entitlement registry and the cache —
  // entitlement must never survive into the next session.
  await detachSubscriptions();
  rotateQueryPersistBuster();
  await mmkvQueryPersister.removeClient();
  await clearSessionSnapshot();
  clearRecentQueriesCache();
}
