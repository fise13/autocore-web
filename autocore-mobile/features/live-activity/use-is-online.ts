import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { resolveCommittedOnline } from '@/lib/offline/netinfo-online';

/**
 * Reachability for the presentation surfaces (Island, Lock Screen, widgets).
 *
 * `isInternetReachable` is tri-state — `null` means "not determined yet", which
 * is not the same as offline. iOS also reports disconnected when leaving the
 * app; that must not flip the Island to "Waiting for connection".
 */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let lastOnline = true;
    const apply = (state: {
      isConnected: boolean | null;
      isInternetReachable: boolean | null | undefined;
    }) => {
      lastOnline = resolveCommittedOnline({
        net: state,
        appState: AppState.currentState,
        lastOnline,
      });
      setOnline(lastOnline);
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
