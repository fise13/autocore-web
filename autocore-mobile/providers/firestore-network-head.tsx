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
 *
 * Never call enableNetwork while already enabled. Firestore 12 RN hard-asserts
 * (c050 / fromVersion on PersistentWriteStream) when the write stream is
 * restarted mid-handshake — that is the toast flood.
 */
const RECOVERY_POLL_MS = 10_000;

let networkOp: Promise<void> = Promise.resolve();

function runNetworkOp(op: () => Promise<void>): Promise<void> {
  networkOp = networkOp.then(op, op);
  return networkOp;
}

export function FirestoreNetworkHead() {
  const seenOnlineRef = useRef(false);
  const lastOnlineRef = useRef(true);
  const offlineCandidateSinceMsRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const apply = async (connected: boolean | null, reachable: boolean | null) => {
      const next = resolveCommittedOnline({
        net: { isConnected: connected, isInternetReachable: reachable },
        appState: AppState.currentState,
        lastOnline: lastOnlineRef.current,
        offlineCandidateSinceMs: offlineCandidateSinceMsRef.current,
      });
      offlineCandidateSinceMsRef.current = next.offlineCandidateSinceMs;
      lastOnlineRef.current = next.online;
      const db = getFirebaseDb();
      if (next.online) {
        seenOnlineRef.current = true;
        if (!pausedRef.current) return;
        await runNetworkOp(async () => {
          if (!pausedRef.current) return;
          try {
            await enableNetwork(db);
            pausedRef.current = false;
          } catch {
            // Already enabled / tearing down.
          }
        });
        return;
      }
      if (!seenOnlineRef.current) return;
      if (AppState.currentState !== 'active') return;
      if (pausedRef.current) return;
      await runNetworkOp(async () => {
        if (pausedRef.current) return;
        try {
          await disableNetwork(db);
          pausedRef.current = true;
        } catch {
          // Already disabled / tearing down.
        }
      });
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      void apply(state.isConnected, state.isInternetReachable);
    });

    /**
     * Recovery poll — only while paused. iOS often does not emit NetInfo
     * when the link returns in-foreground, so a spurious disconnect could
     * otherwise park Firestore for the rest of the session.
     */
    const recovery = setInterval(() => {
      if (!pausedRef.current) return;
      void NetInfo.fetch().then((state) => {
        void apply(state.isConnected, state.isInternetReachable);
      });
    }, RECOVERY_POLL_MS);
    const appState = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      if (!pausedRef.current) return;
      void NetInfo.fetch().then((state) => {
        void apply(state.isConnected, state.isInternetReachable);
      });
    });

    return () => {
      unsubscribe();
      appState.remove();
      clearInterval(recovery);
    };
  }, []);

  return null;
}
