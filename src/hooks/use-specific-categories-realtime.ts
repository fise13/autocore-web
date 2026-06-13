"use client";

import { useMemo } from "react";

import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
} from "@/infrastructure/firestore/specific-category-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useSpecificCategoriesRealtime(
  repository: SpecificCategoryRepository,
  companyId: string,
  enabled = true,
) {
  const canSubscribe = Boolean(enabled && companyId);
  const queryKey = useMemo(() => ["specific-categories", companyId] as const, [companyId]);

  const { data } = useRealtimeQuery<SpecificCategoryEntity[]>({
    queryKey,
    enabled: canSubscribe,
    initialData: [],
    subscribe: (onData, onError) =>
      repository.subscribeCategories(companyId, onData, onError),
  });

  return canSubscribe ? data : [];
}
