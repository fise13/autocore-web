"use client";

import { useEffect, useState } from "react";

import { PayrollTransaction } from "@/domain/payroll-transaction";
import { PayrollTransactionRepository } from "@/infrastructure/firestore/payroll-transaction-repository";

export function usePayrollTransactionsRealtime(
  repository: PayrollTransactionRepository,
  companyId: string,
  enabled = true,
) {
  const [transactions, setTransactions] = useState<PayrollTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !enabled) {
      return;
    }

    const unsubscribe = repository.subscribe(
      companyId,
      (next) => {
        setTransactions(next);
        setIsLoading(false);
        setError(null);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [repository, companyId, enabled]);

  const active = Boolean(companyId && enabled);
  return {
    transactions: active ? transactions : [],
    isLoading: active ? isLoading : false,
    error: active ? error : null,
  };
}
