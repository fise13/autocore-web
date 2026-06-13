"use client";

import { useMemo } from "react";

import { InventoryImportJob } from "@/domain/inventory-import";
import { InventoryImportRepository } from "@/infrastructure/firestore/inventory-import-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useImportJobsRealtime(
  repository: InventoryImportRepository,
  companyId: string | undefined,
  enabled = true,
) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["import-jobs", companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<InventoryImportJob[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => repository.subscribe(companyId!, onData, onError),
  });

  return {
    jobs: active ? data : [],
    loading: active ? isBootstrapping : false,
    errorMessage: active ? errorMessage : null,
  };
}
