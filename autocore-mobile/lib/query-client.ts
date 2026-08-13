import { onlineManager, QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
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
