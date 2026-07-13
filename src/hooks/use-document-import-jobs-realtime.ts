"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type { DocumentImportJob } from "@/domain/document-import";
import { DocumentImportRepository } from "@/infrastructure/firestore/document-import-repository";
import { fetchDocumentImports } from "@/lib/document-import/fetch-document-imports.client";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

const repository = new DocumentImportRepository();

function mergeJobs(apiJobs: DocumentImportJob[], realtimeJobs: DocumentImportJob[]): DocumentImportJob[] {
  const merged = new Map<string, DocumentImportJob>();
  for (const job of apiJobs) {
    merged.set(job.id, job);
  }
  for (const job of realtimeJobs) {
    merged.set(job.id, job);
  }
  return Array.from(merged.values()).sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
}

export function useDocumentImportJobsRealtime(companyId: string | undefined, enabled = true) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["document-import-jobs", companyId] as const, [companyId]);

  const apiQuery = useQuery({
    queryKey: [...queryKey, "api"],
    queryFn: fetchDocumentImports,
    enabled: active,
    staleTime: 15_000,
    refetchInterval: active ? 20_000 : false,
    refetchOnWindowFocus: true,
  });

  const { data: realtimeJobs, isBootstrapping, errorMessage } = useRealtimeQuery<DocumentImportJob[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => repository.subscribe(companyId!, onData, onError),
  });

  const jobs = useMemo(
    () => (active ? mergeJobs(apiQuery.data ?? [], realtimeJobs) : []),
    [active, apiQuery.data, realtimeJobs],
  );
  const loading = active && (apiQuery.isLoading || isBootstrapping) && jobs.length === 0;
  const combinedError =
    errorMessage ??
    (apiQuery.error instanceof Error ? apiQuery.error.message : null);

  return {
    jobs,
    loading,
    errorMessage: combinedError,
    refresh: () => void apiQuery.refetch(),
  };
}

export function useDocumentImportJobRealtime(
  companyId: string | undefined,
  jobId: string | undefined,
  enabled = true,
) {
  const active = Boolean(companyId && jobId && enabled);
  const queryKey = useMemo(
    () => ["document-import-job", companyId, jobId] as const,
    [companyId, jobId],
  );
  const [apiJob, setApiJob] = useState<DocumentImportJob | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(active);

  useEffect(() => {
    if (!active) {
      setApiJob(null);
      setApiError(null);
      setApiLoading(false);
      return;
    }

    let cancelled = false;
    setApiLoading(true);

    void fetchDocumentImports()
      .then((jobs) => {
        if (cancelled) return;
        setApiJob(jobs.find((job) => job.id === jobId) ?? null);
        setApiError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setApiError(error instanceof Error ? error.message : "Не удалось загрузить документ");
      })
      .finally(() => {
        if (!cancelled) setApiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, jobId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<DocumentImportJob | null>({
    queryKey,
    enabled: active,
    initialData: null,
    subscribe: (onData, onError) =>
      repository.subscribeOne(companyId!, jobId!, onData, onError),
  });

  return {
    job: data ?? apiJob,
    loading: active && (apiLoading || isBootstrapping) && !data && !apiJob,
    errorMessage: errorMessage ?? apiError,
  };
}
