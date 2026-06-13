"use client";

import { useMemo } from "react";

import { MotorImportJob } from "@/domain/motor-import";
import { MotorImportRepository } from "@/infrastructure/firestore/motor-import-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useMotorImportJobsRealtime(
  repository: MotorImportRepository,
  companyId: string | undefined,
  enabled = true,
) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["motor-import-jobs", companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<MotorImportJob[]>({
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
