import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { isProductionCompanyId } from '@/lib/company-id';
import { createClientRepository } from '@/services/firestore/client-repository';
import type { ClientEntity } from '@/types/client';

const clientRepository = createClientRepository();

export function useClientsRealtime(
  companyId: string | null | undefined,
  options?: { keepAlive?: boolean },
) {
  const enabled = isProductionCompanyId(companyId);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<ClientEntity[]>({
    queryKey: ['realtime', 'clients', companyId],
    enabled,
    keepAlive: options?.keepAlive,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      return clientRepository.subscribe(companyId, onData, (error) => onError({ message: error.message }));
    },
  });

  return {
    clients: data,
    isBootstrapping,
    errorMessage,
    enabled,
  };
}
