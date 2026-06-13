"use client";

import { useMemo } from "react";

import {
  SpecificCategoryRepository,
  SpecificRecordEntity,
} from "@/infrastructure/firestore/specific-category-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useAllSpecificRecordsRealtime(
  repository: SpecificCategoryRepository,
  companyId: string,
) {
  const enabled = Boolean(companyId);
  const queryKey = useMemo(() => ["all-specific-records", companyId] as const, [companyId]);

  const { data, isBootstrapping } = useRealtimeQuery<SpecificRecordEntity[]>({
    queryKey,
    enabled,
    initialData: [],
    subscribe: (onData) =>
      repository.subscribeAllRecords(
        companyId,
        onData,
        () => onData([]),
      ),
  });

  return {
    records: enabled && !isBootstrapping ? data : [],
    loading: enabled ? isBootstrapping : false,
  };
}
