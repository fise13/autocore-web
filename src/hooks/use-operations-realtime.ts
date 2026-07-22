"use client";

import { useMemo } from "react";

import { getOperationsUseCase } from "@/application/use-cases/get-operations";
import { FinancialOperation } from "@/domain/financial-operation";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  FinancialOperationsFilters,
  FinancialOperationRepository,
} from "@/infrastructure/firestore/financial-operation-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useOperationsRealtime(
  repository: FinancialOperationRepository,
  filters: FinancialOperationsFilters & { enabled?: boolean },
) {
  const companyId = normalizeCompanyId(filters.companyId);
  const { type, enabled = true } = filters;
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(
    () => ["financial-operations", companyId, type ?? "all"] as const,
    [companyId, type],
  );

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<FinancialOperation[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) =>
      getOperationsUseCase(repository, { companyId, type }, onData, onError),
  });

  return {
    data: active ? data : [],
    isBootstrapping: active ? isBootstrapping : false,
    isLoading: active ? isBootstrapping : false,
    errorMessage: active ? errorMessage : null,
    isError: Boolean(active && errorMessage),
  };
}
