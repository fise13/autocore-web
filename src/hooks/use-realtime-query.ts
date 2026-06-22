"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type RealtimeError = { code?: string; message: string };

type UseRealtimeQueryOptions<T> = {
  queryKey: readonly unknown[];
  enabled?: boolean;
  initialData?: T;
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
  subscribe,
}: UseRealtimeQueryOptions<T>): UseRealtimeQueryResult<T> {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snapshotKey, setSnapshotKey] = useState<string | null>(null);
  const activeKey = queryKey.join("|");

  const query = useQuery<T>({
    queryKey,
    queryFn: async () => initialData as T,
    enabled,
    initialData,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribe(
      (data) => {
        setErrorMessage(null);
        setSnapshotKey(activeKey);
        queryClient.setQueryData(queryKey, data);
      },
      (error) => {
        if (error.code === "permission-denied" || error.code === "unauthenticated") {
          setSnapshotKey(activeKey);
          return;
        }
        setErrorMessage(error.message);
        setSnapshotKey(activeKey);
      },
    );

    return unsubscribe;
    // subscribe is intentionally omitted — re-subscribe only when query identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, queryClient, queryKey, activeKey]);

  const data = (enabled ? query.data : initialData) as T;
  const isBootstrapping = enabled && snapshotKey !== activeKey;

  return {
    data,
    isBootstrapping,
    errorMessage: enabled ? errorMessage : null,
  };
}
