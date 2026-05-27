"use client";

import { useEffect, useState } from "react";

import { ActivityLogEntry } from "@/domain/rbac";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { isIgnorableFirestoreError } from "@/lib/firestore/snapshot-errors";

const activityRepository = createActivityLogRepository();

export function useActivityLogRealtime(companyId: string, enabled: boolean) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !companyId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = activityRepository.subscribe(
      companyId,
      (next) => {
        setEntries(next);
        setIsLoading(false);
        setError(null);
      },
      (nextError) => {
        if (isIgnorableFirestoreError(nextError as Parameters<typeof isIgnorableFirestoreError>[0])) {
          setEntries([]);
          setError("Недостаточно прав для просмотра журнала активности.");
        } else {
          setError(nextError.message);
        }
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [companyId, enabled]);

  return { entries, isLoading, error };
}
