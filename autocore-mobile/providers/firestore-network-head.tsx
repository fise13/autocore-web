import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { resolveCommittedOnline } from '@/lib/offline/netinfo-online';
import { getFirebaseDb, isFirebaseConfigured } from '@/services/firebase';

/**
 * Pause Firestore's network when the radio is down so writes stay queued in
 * memory for this session instead of failing immediately. First-launch unknown
 * NetInfo is ignored so we do not disable before the first successful attach.
 *
 * iOS NetInfo reports offline when leaving the app — do not disableNetwork
 * then, or background sync and the next foreground look like a real outage.
 */
export function FirestoreNetworkHead() {
  const seenOnlineRef = useRef(false);
  const lastOnlineRef = useRef(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const apply = async (connected: boolean | null, reachable: boolean | null) => {
      const online = resolveCommittedOnline({
        net: { isConnected: connected, isInternetReachable: reachable },
        appState: AppState.currentState,
        lastOnline: lastOnlineRef.current,
      });
      lastOnlineRef.current = online;
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
      if (AppState.currentState !== 'active') return;
      try {
        await disableNetwork(db);
      } catch {
        // Already disabled / tearing down.
      }
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      void apply(state.isConnected, state.isInternetReachable);
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void NetInfo.fetch().then((state) => {
        void apply(state.isConnected, state.isInternetReachable);
      });
    });

    return () => {
      unsubscribe();
      appState.remove();
    };
  }, []);

  return null;
}
