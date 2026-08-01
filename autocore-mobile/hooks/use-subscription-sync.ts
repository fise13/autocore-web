import { useMemo, useSyncExternalStore } from 'react';

import { useEntitlement } from '@/hooks/use-entitlement';
import { getDevState, isDevModeAvailable, subscribeDevMode } from '@/lib/subscriptions/dev-mode';
import { useAuthStore } from '@/store/auth-store';
import type { ToneName } from '@/theme';

export type SyncState = {
  /** Device connectivity, including the dev "force offline" switch. */
  isOnline: boolean;
  /** The entitlement did not come from a live server read. */
  isStale: boolean;
  /** Simulated by the dev panel — always surfaced, never silent. */
  isSimulated: boolean;
  label: string;
  tone: ToneName;
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
 */
export function useSubscriptionSync(): SyncState {
  const { entitlement } = useEntitlement();
  const networkOnline = useAuthStore((s) => s.isOnline);

  const devOffline = useSyncExternalStore(subscribeDevMode, readDevOffline, readDevOffline);

  return useMemo(() => {
    const isOnline = networkOnline && !devOffline;
    const isSimulated = entitlement.source === 'dev';
    const isStale = entitlement.source === 'cached' || entitlement.source === 'local_unverified';

    if (isSimulated) {
      return { isOnline, isStale, isSimulated, label: 'Simulated', tone: 'warning' as ToneName };
    }
    if (!isOnline) {
      return { isOnline, isStale, isSimulated, label: 'Offline — showing saved status', tone: 'muted' as ToneName };
    }
    if (entitlement.source === 'local_unverified') {
      return { isOnline, isStale, isSimulated, label: 'Verifying with server…', tone: 'muted' as ToneName };
    }
    if (entitlement.source === 'cached') {
      return { isOnline, isStale, isSimulated, label: 'Syncing…', tone: 'muted' as ToneName };
    }
    return { isOnline, isStale, isSimulated, label: 'Up to date', tone: 'success' as ToneName };
  }, [devOffline, entitlement.source, networkOnline]);
}
