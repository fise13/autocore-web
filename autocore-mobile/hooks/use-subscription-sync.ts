import { useMemo, useSyncExternalStore } from 'react';

import { useEntitlement } from '@/hooks/use-entitlement';
import { getDevState, isDevModeAvailable, subscribeDevMode } from '@/lib/subscriptions/dev-mode';
import { useAuthStore } from '@/store/auth-store';

export type SyncState = {
  /** Device connectivity, including the dev "force offline" switch. */
  isOnline: boolean;
  /** The entitlement did not come from a live server read. */
  isStale: boolean;
  label: string;
};

function readDevOffline(): boolean {
  return isDevModeAvailable() && getDevState().forceOffline;
}

/**
 * How much to trust what is on screen right now.
 *
 * Users care about one thing here: "is this number current?". The answer
 * depends on connectivity *and* on which resolver source won, which is why both
 * are folded into a single state rather than shown as two separate chips.
 *
 * A dev-simulated entitlement is deliberately *not* one of these states. It
 * used to paint a "Simulated" chip on the plan card, which is noise on the one
 * screen where the dev panel sitting right below it already names the active
 * scenario — and it can never appear in a release build anyway.
 */
export function useSubscriptionSync(): SyncState {
  const { entitlement } = useEntitlement();
  const networkOnline = useAuthStore((s) => s.isOnline);

  const devOffline = useSyncExternalStore(subscribeDevMode, readDevOffline, readDevOffline);

  return useMemo(() => {
    const isOnline = networkOnline && !devOffline;
    const isStale = entitlement.source === 'cached' || entitlement.source === 'local_unverified';

    if (!isOnline) {
      return { isOnline, isStale, label: 'Offline — showing saved status' };
    }
    if (entitlement.source === 'local_unverified') {
      return { isOnline, isStale, label: 'Verifying with server…' };
    }
    if (entitlement.source === 'cached') {
      return { isOnline, isStale, label: 'Syncing…' };
    }
    return { isOnline, isStale, label: 'Up to date' };
  }, [devOffline, entitlement.source, networkOnline]);
}
