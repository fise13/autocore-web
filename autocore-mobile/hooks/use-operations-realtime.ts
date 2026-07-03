import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { isProductionCompanyId } from '@/lib/company-id';
import { financialOperationRepository } from '@/services/firestore/financial-operation-repository';
import type { FinancialOperation } from '@/types/financial-operation';

export function useOperationsRealtime(companyId: string | null | undefined) {
  const enabled = isProductionCompanyId(companyId);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<FinancialOperation[]>({
    queryKey: ['realtime', 'financial-operations', companyId],
    enabled,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      return financialOperationRepository.subscribe(
        { companyId },
        onData,
        (error) => onError({ message: error.message }),
      );
    },
  });

  return {
    operations: data,
    isBootstrapping,
    errorMessage,
    enabled,
  };
}
