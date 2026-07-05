import { QueryClient } from '@tanstack/react-query';

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
    },
  },
});
