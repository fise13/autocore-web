"use client";

import { useMemo } from "react";

import { PayrollTransaction } from "@/domain/payroll-transaction";
import { PayrollTransactionRepository } from "@/infrastructure/firestore/payroll-transaction-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function usePayrollTransactionsRealtime(
  repository: PayrollTransactionRepository,
  companyId: string,
  enabled = true,
) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["payroll-transactions", companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<PayrollTransaction[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => repository.subscribe(companyId, onData, onError),
  });

  return {
    transactions: active ? data : [],
    isLoading: active ? isBootstrapping : false,
    error: active ? errorMessage : null,
  };
}
