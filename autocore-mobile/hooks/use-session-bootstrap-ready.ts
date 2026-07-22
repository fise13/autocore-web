import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  areAcquiredSessionListenersReady,
  subscribeRealtimeRegistry,
} from '@/lib/realtime/subscription-registry';

/** Absolute fail-open — never soft-lock on the splash. */
const BOOTSTRAP_TIMEOUT_MS = 10_000;

/**
 * True when every acquired session listener has delivered a first snapshot
 * (or the fail-open timeout fired).
 */
export function useSessionBootstrapReady(
  companyId: string | null,
  _uid: string | null,
  active: boolean,
): { ready: boolean; timedOut: boolean } {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setTimedOut(false);
    if (!active || !companyId) return;
    const timer = setTimeout(() => setTimedOut(true), BOOTSTRAP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [active, companyId]);

  const allReady = useSyncExternalStore(
    subscribeRealtimeRegistry,
    () => {
      if (!active || !companyId) return false;
      return areAcquiredSessionListenersReady();
    },
    () => false,
  );

  return {
    ready: allReady || timedOut,
    timedOut: timedOut && !allReady,
  };
}
