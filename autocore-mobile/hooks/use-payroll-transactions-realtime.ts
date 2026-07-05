import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { isProductionCompanyId } from '@/lib/company-id';
import { payrollTransactionRepository } from '@/services/firestore/payroll-transaction-repository';
import type { PayrollTransaction } from '@/types/payroll-transaction';

export function usePayrollTransactionsRealtime(
  companyId: string | null | undefined,
  options?: { keepAlive?: boolean },
) {
  const enabled = isProductionCompanyId(companyId);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<PayrollTransaction[]>({
    queryKey: ['realtime', 'payroll-transactions', companyId],
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

  return {
    payroll: data,
    isBootstrapping,
    errorMessage,
    enabled,
  };
}
