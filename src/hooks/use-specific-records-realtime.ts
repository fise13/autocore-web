"use client";

import { useMemo } from "react";

import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
  SpecificRecordEntity,
} from "@/infrastructure/firestore/specific-category-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useSpecificRecordsRealtime(
  repository: SpecificCategoryRepository,
  companyId: string,
  category: SpecificCategoryEntity | null,
  allCategories: SpecificCategoryEntity[],
) {
  const enabled = Boolean(companyId && category);
  const categoryKey = category ? `${category.id}:${category.localId}` : null;
  const queryKey = useMemo(
    () => ["specific-records", companyId, categoryKey] as const,
    [companyId, categoryKey],
  );

  const { data, isBootstrapping } = useRealtimeQuery<SpecificRecordEntity[]>({
    queryKey,
    enabled,
    initialData: [],
    subscribe: (onData) => {
      if (!category) return () => undefined;
      return repository.subscribeRecords(
        companyId,
        category,
        allCategories,
        onData,
        () => onData([]),
      );
    },
  });

  return {
    records: enabled && !isBootstrapping ? data : [],
    loading: enabled ? isBootstrapping : false,
  };
}
