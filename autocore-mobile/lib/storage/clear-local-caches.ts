import { clearSubscriptionCaches } from '@/lib/billing/subscription-cache';
import { clearSubscriptionRegistry } from '@/lib/billing/subscription-registry';
import { resetAppShellReady } from '@/lib/app-shell-ready';
import { clearRealtimeSubscriptions } from '@/lib/realtime/subscription-registry';
import { clearSessionSnapshot } from '@/lib/session/session-snapshot-cache';
import { mmkvQueryPersister, rotateQueryPersistBuster } from '@/lib/storage/mmkv-query-persister';
import { clearRecentQueriesCache } from '@/lib/search/recent-queries';

export async function clearLocalSessionCaches(): Promise<void> {
  resetAppShellReady();
  clearRealtimeSubscriptions();
  clearSubscriptionRegistry();
  rotateQueryPersistBuster();
  await mmkvQueryPersister.removeClient();
  await clearSessionSnapshot();
  await clearSubscriptionCaches();
  clearRecentQueriesCache();
}
