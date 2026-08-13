import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { resolveCommittedOnline } from '@/lib/offline/netinfo-online';

/**
 * Reachability for the presentation surfaces (Island, Lock Screen, widgets).
 *
 * Link state only — iOS `isInternetReachable` and background disconnects must
 * not flip the Island to "Waiting for connection".
 */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let lastOnline = true;
    let offlineCandidateSinceMs: number | null = null;
    const apply = (state: {
      isConnected: boolean | null;
      isInternetReachable: boolean | null | undefined;
    }) => {
      const next = resolveCommittedOnline({
        net: state,
        appState: AppState.currentState,
        lastOnline,
        offlineCandidateSinceMs,
      });
      offlineCandidateSinceMs = next.offlineCandidateSinceMs;
      lastOnline = next.online;
      setOnline(next.online);
    };

    void NetInfo.fetch().then(apply);
    const unsubscribe = NetInfo.addEventListener(apply);
    const appState = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void NetInfo.fetch().then(apply);
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, []);

  return online;
}
