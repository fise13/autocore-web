"use client";

import { useMemo } from "react";

import type { DocumentImportJob } from "@/domain/document-import";
import { DocumentImportRepository } from "@/infrastructure/firestore/document-import-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

const repository = new DocumentImportRepository();

export function useDocumentImportJobsRealtime(companyId: string | undefined, enabled = true) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["document-import-jobs", companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<DocumentImportJob[]>({
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

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<DocumentImportJob | null>({
    queryKey,
    enabled: active,
    initialData: null,
    subscribe: (onData, onError) =>
      repository.subscribeOne(companyId!, jobId!, onData, onError),
  });

  return {
    job: active ? data : null,
    loading: active ? isBootstrapping : false,
    errorMessage: active ? errorMessage : null,
  };
}
