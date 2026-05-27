"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { getOperationsUseCase } from "@/application/use-cases/get-operations";
import { FinancialOperation } from "@/domain/financial-operation";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  FinancialOperationsFilters,
  FinancialOperationRepository,
} from "@/infrastructure/firestore/financial-operation-repository";

export function useOperationsRealtime(
  repository: FinancialOperationRepository,
  filters: FinancialOperationsFilters & { enabled?: boolean },
) {
  const queryClient = useQueryClient();
  const companyId = normalizeCompanyId(filters.companyId);
  const { type, enabled = true } = filters;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryKey = useMemo(
    () => ["financial-operations", companyId, type ?? "all"] as const,
    [companyId, type],
  );

  const query = useQuery<FinancialOperation[]>({
    queryKey,
    queryFn: async () => [],
    enabled: Boolean(companyId && enabled),
    initialData: [],
  });

  useEffect(() => {
    if (!companyId || !enabled) return;

    const unsubscribe = getOperationsUseCase(
      repository,
      { companyId, type },
      (operations) => {
        setErrorMessage(null);
        queryClient.setQueryData(queryKey, operations);
      },
      (error) => {
        if (error.code === "permission-denied" || error.code === "unauthenticated") {
          setErrorMessage(null);
          return;
        }
        setErrorMessage(error.message);
      },
    );

    return () => unsubscribe();
  }, [repository, companyId, enabled, type, queryClient, queryKey]);

  return {
    ...query,
    errorMessage,
    isError: Boolean(errorMessage),
  };
}
