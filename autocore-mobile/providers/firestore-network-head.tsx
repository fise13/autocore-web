import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';

import { getFirebaseDb, isFirebaseConfigured } from '@/services/firebase';

function isOnlineState(connected: boolean | null, reachable: boolean | null): boolean {
  return Boolean(connected && reachable !== false);
}

/**
 * Pause Firestore's network when the radio is down so writes stay queued in
 * memory for this session instead of failing immediately. First-launch unknown
 * NetInfo is ignored so we do not disable before the first successful attach.
 */
export function FirestoreNetworkHead() {
  const seenOnlineRef = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const apply = async (connected: boolean | null, reachable: boolean | null) => {
      const online = isOnlineState(connected, reachable);
      const db = getFirebaseDb();
      if (online) {
        seenOnlineRef.current = true;
        try {
          await enableNetwork(db);
        } catch {
          // Already enabled / tearing down.
        }
        return;
      }
      if (!seenOnlineRef.current) return;
      try {
        await disableNetwork(db);
      } catch {
        // Already disabled / tearing down.
      }
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      void apply(state.isConnected, state.isInternetReachable);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return null;
}
