"use client";

import { useMemo } from "react";

import { ActivityLogEntry } from "@/domain/rbac";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { isIgnorableFirestoreError } from "@/lib/firestore/snapshot-errors";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

const activityRepository = createActivityLogRepository();

export function useActivityLogRealtime(companyId: string, enabled: boolean) {
  const active = Boolean(enabled && companyId);
  const queryKey = useMemo(() => ["activity-log", companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<ActivityLogEntry[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) =>
      activityRepository.subscribe(
        companyId,
        onData,
        (nextError) => {
          if (isIgnorableFirestoreError(nextError as Parameters<typeof isIgnorableFirestoreError>[0])) {
            onData([]);
            onError({ message: "Недостаточно прав для просмотра журнала активности." });
            return;
          }
          onError(nextError);
        },
      ),
  });

  return {
    entries: active ? data : [],
    isLoading: active ? isBootstrapping : false,
    error: active ? errorMessage : null,
  };
}
