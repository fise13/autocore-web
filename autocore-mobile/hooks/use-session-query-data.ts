import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

/**
 * Read SessionRealtimeHead / keepAlive catalogs from React Query.
 * Keeps the last good value across brief companyId / enabled flickers so
 * Overview charts and Finance do not blank mid-session.
 */
export function useSessionQueryData<T>(
  queryKey: readonly unknown[],
  enabled: boolean,
  fallback: T,
): T {
  const queryClient = useQueryClient();
  const lastGoodRef = useRef<T>(fallback);
  const active = Boolean(enabled);

  const { data } = useQuery<T>({
    queryKey,
    enabled: active,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    queryFn: async () => {
      const cached = queryClient.getQueryData<T>(queryKey);
      return (cached ?? lastGoodRef.current ?? fallback) as T;
    },
    initialData: () => {
      const cached = queryClient.getQueryData<T>(queryKey);
      return (cached ?? lastGoodRef.current ?? fallback) as T;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (active && data !== undefined) {
    lastGoodRef.current = data;
    return data;
  }

  return lastGoodRef.current;
}
