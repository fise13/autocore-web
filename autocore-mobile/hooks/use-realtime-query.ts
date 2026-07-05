import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import {
  acquireRealtimeSubscription,
  isRealtimeReady,
} from '@/lib/realtime/subscription-registry';
import { readRealtimeSnapshotSync } from '@/lib/realtime/snapshot-cache';

type RealtimeError = { code?: string; message: string };

type UseRealtimeQueryOptions<T> = {
  queryKey: readonly unknown[];
  enabled?: boolean;
  initialData?: T;
  /** Keep listener alive for the session even when no screen is mounted. */
  keepAlive?: boolean;
  subscribe: (
    onData: (data: T) => void,
    onError: (error: RealtimeError) => void,
  ) => () => void;
};

type UseRealtimeQueryResult<T> = {
  data: T;
  isBootstrapping: boolean;
  errorMessage: string | null;
};

export function useRealtimeQuery<T>({
  queryKey,
  enabled = true,
  initialData,
  keepAlive = false,
  subscribe,
}: UseRealtimeQueryOptions<T>): UseRealtimeQueryResult<T> {
  const queryClient = useQueryClient();
  const activeKey = queryKey.join('|');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(() => {
    if (!enabled) return false;
    if (isRealtimeReady(queryKey)) return true;
    return readRealtimeSnapshotSync<T>(queryKey) != null;
  });
  const subscribeRef = useRef(subscribe);
  subscribeRef.current = subscribe;

  const diskSeed = enabled ? readRealtimeSnapshotSync<T>(queryKey) : undefined;
  const seededData = diskSeed ?? initialData;

  const query = useQuery<T>({
    queryKey,
    queryFn: async () => {
      const cached = queryClient.getQueryData<T>(queryKey);
      return (cached ?? seededData) as T;
    },
    enabled,
    ...(seededData !== undefined ? { initialData: seededData as NonNullable<T> } : {}),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      setErrorMessage(null);
      return;
    }

    if (isRealtimeReady(queryKey)) {
      setReady(true);
    }

    const bootstrapTimeout = setTimeout(() => {
      setReady(true);
    }, 8_000);

    const release = acquireRealtimeSubscription<T>(
      queryKey,
      (onData, onError) => subscribeRef.current(onData, onError),
      {
        onData: (data) => {
          setErrorMessage(null);
          setReady(true);
          queryClient.setQueryData(queryKey, data);
        },
        onError: (error) => {
          if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
            setReady(true);
            return;
          }
          setErrorMessage(error.message);
          setReady(true);
        },
      },
      { keepAlive },
    );

    return () => {
      clearTimeout(bootstrapTimeout);
      release();
    };
    // queryKey identity is represented by activeKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, keepAlive, queryClient, activeKey]);

  const data = (enabled ? query.data : initialData) as T;
  const isBootstrapping = enabled && !ready && diskSeed == null;

  return {
    data,
    isBootstrapping,
    errorMessage: enabled ? errorMessage : null,
  };
}
