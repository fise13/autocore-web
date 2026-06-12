"use client";

import { useEffect, useState } from "react";

import { PayrollTransaction } from "@/domain/payroll-transaction";
import { PayrollTransactionRepository } from "@/infrastructure/firestore/payroll-transaction-repository";

export function useMyPayrollTransactions(
  repository: PayrollTransactionRepository,
  companyId: string,
  employeeId: string,
  enabled = true,
) {
  const [transactions, setTransactions] = useState<PayrollTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !employeeId || !enabled) {
      return;
    }

    const unsubscribe = repository.subscribeByEmployee(
      companyId,
      employeeId,
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
  }, [repository, companyId, employeeId, enabled]);

  const active = Boolean(companyId && employeeId && enabled);
  return {
    transactions: active ? transactions : [],
    isLoading: active ? isLoading : false,
    error: active ? error : null,
  };
}
