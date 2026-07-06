import { useMemo } from 'react';

import type { DataScope } from '@autocore/rbac';
import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { isProductionCompanyId } from '@/lib/company-id';
import { payrollTransactionRepository } from '@/services/firestore/payroll-transaction-repository';
import type { PayrollTransaction } from '@/types/payroll-transaction';

export function usePayrollTransactionsRealtime(
  companyId: string | null | undefined,
  options?: { keepAlive?: boolean; scope?: DataScope; employeeId?: string | null },
) {
  const enabled = isProductionCompanyId(companyId);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<PayrollTransaction[]>({
    queryKey: ['realtime', 'payroll-transactions', companyId, options?.scope, options?.employeeId],
    enabled,
    keepAlive: options?.keepAlive,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      return payrollTransactionRepository.subscribe(companyId, onData, (error) =>
        onError({ message: error.message }),
      );
    },
  });

  const payroll = useMemo(() => {
    if (options?.scope !== 'own_payroll' || !options.employeeId) return data;
    return data.filter((row) => row.employeeId === options.employeeId);
  }, [data, options?.scope, options?.employeeId]);

  return {
    payroll,
    isBootstrapping,
    errorMessage,
    enabled,
  };
}
