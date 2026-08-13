import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Reachability for the presentation surfaces (Island, Lock Screen, widgets).
 *
 * `isInternetReachable` is tri-state — `null` means "not determined yet", which
 * is not the same as offline. Treating it as offline is what made the Island
 * flash "Waiting for connection" for a beat on every cold start.
 */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const apply = (state: {
      isConnected: boolean | null;
      isInternetReachable: boolean | null | undefined;
    }) => {
      setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    };

    void NetInfo.fetch().then(apply);
    const unsubscribe = NetInfo.addEventListener(apply);
    return () => unsubscribe();
  }, []);

  return online;
}
