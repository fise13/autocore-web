"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { ImportBatch, ImportBatchFile, ImportSuggestedRow } from "@/domain/import-batch";
import { ImportBatchRepository } from "@/infrastructure/firestore/import-batch-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";
import { fetchImportBatches } from "@/lib/import-batch/fetch-import-batches.client";

const repository = new ImportBatchRepository();

export function useImportBatchesRealtime(companyId: string | undefined, enabled = true) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["import-batches", companyId] as const, [companyId]);

  const apiQuery = useQuery({
    queryKey: [...queryKey, "api"],
    queryFn: fetchImportBatches,
    enabled: active,
    staleTime: 15_000,
  });

  const { data: realtime, isBootstrapping, errorMessage } = useRealtimeQuery<ImportBatch[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => repository.subscribe(companyId!, onData, onError),
  });

  const batches = useMemo(() => {
    if (!active) return [];
    const map = new Map<string, ImportBatch>();
    for (const b of apiQuery.data ?? []) map.set(b.id, b);
    for (const b of realtime) map.set(b.id, b);
    return Array.from(map.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }, [active, apiQuery.data, realtime]);

  return {
    batches,
    loading: active && (apiQuery.isLoading || isBootstrapping) && batches.length === 0,
    errorMessage:
      errorMessage ?? (apiQuery.error instanceof Error ? apiQuery.error.message : null),
  };
}

export function useImportBatchRealtime(
  companyId: string | undefined,
  batchId: string | undefined,
  enabled = true,
) {
  const active = Boolean(companyId && batchId && enabled);
  const queryKey = useMemo(
    () => ["import-batch", companyId, batchId] as const,
    [companyId, batchId],
  );

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<ImportBatch | null>({
    queryKey,
    enabled: active,
    initialData: null,
    subscribe: (onData, onError) =>
      repository.subscribeOne(companyId!, batchId!, onData, onError),
  });

  return {
    batch: data,
    loading: active && isBootstrapping && !data,
    errorMessage,
  };
}

export function useImportBatchFilesRealtime(batchId: string | undefined, enabled = true) {
  const active = Boolean(batchId && enabled);
  const queryKey = useMemo(() => ["import-batch-files", batchId] as const, [batchId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<ImportBatchFile[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => repository.subscribeFiles(batchId!, onData, onError),
  });

  return {
    files: data,
    loading: active && isBootstrapping && data.length === 0,
    errorMessage,
  };
}

export function useImportBatchRowsRealtime(batchId: string | undefined, enabled = true) {
  const active = Boolean(batchId && enabled);
  const queryKey = useMemo(() => ["import-batch-rows", batchId] as const, [batchId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<ImportSuggestedRow[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => repository.subscribeRows(batchId!, onData, onError),
  });

  return {
    rows: data,
    loading: active && isBootstrapping && data.length === 0,
    errorMessage,
  };
}
