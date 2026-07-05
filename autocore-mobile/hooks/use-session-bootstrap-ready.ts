import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { sessionBootstrapQueryKeys } from '@/lib/realtime/session-bootstrap-keys';
import {
  areRealtimeKeysReady,
  subscribeRealtimeRegistry,
} from '@/lib/realtime/subscription-registry';

const BOOTSTRAP_TIMEOUT_MS = 8_000;

/**
 * Tracks when all session Firestore listeners have delivered their first snapshot.
 * Uses the shared registry so we do not re-render on every individual hook update.
 */
export function useSessionBootstrapReady(
  companyId: string | null,
  uid: string | null,
  active: boolean,
): { ready: boolean; timedOut: boolean } {
  const keys = useMemo(
    () => (active && companyId ? sessionBootstrapQueryKeys(companyId, uid) : []),
    [active, companyId, uid],
  );

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setTimedOut(false);
    if (!active || keys.length === 0) return;
    const timer = setTimeout(() => setTimedOut(true), BOOTSTRAP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [active, keys]);

  const allReady = useSyncExternalStore(
    subscribeRealtimeRegistry,
    () => {
      if (!active || keys.length === 0) return true;
      return areRealtimeKeysReady(keys);
    },
    () => false,
  );

  return {
    ready: allReady || timedOut,
    timedOut: timedOut && !allReady,
  };
}
