import { onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { resolveCommittedOnline } from '@/lib/offline/netinfo-online';

onlineManager.setEventListener((setOnline) => {
  let lastOnline = true;
  const apply = (state: {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
  }) => {
    lastOnline = resolveCommittedOnline({
      net: state,
      appState: AppState.currentState,
      lastOnline,
    });
    setOnline(lastOnline);
  };
  const unsubscribeNet = NetInfo.addEventListener(apply);
  const appState = AppState.addEventListener('change', (next) => {
    if (next !== 'active') return;
    void NetInfo.fetch().then(apply);
  });
  return () => {
    unsubscribeNet();
    appState.remove();
  };
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** Realtime listeners own freshness; avoid tab-switch refetches. */
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60,
      retry: 1,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      /** Run immediately so offline work can be queued instead of spinning. */
      networkMode: 'always',
      retry: 0,
    },
  },
});
