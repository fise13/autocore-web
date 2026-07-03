import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { isProductionCompanyId } from '@/lib/company-id';
import { vehicleRepository } from '@/services/firestore/vehicle-repository';
import type { VehicleEntity } from '@/types/vehicle';

export function useVehiclesRealtime(companyId: string | null | undefined) {
  const enabled = isProductionCompanyId(companyId);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<VehicleEntity[]>({
    queryKey: ['realtime', 'vehicles', companyId],
    enabled,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      return vehicleRepository.subscribe(companyId, onData, (error) => onError({ message: error.message }));
    },
  });

  return {
    vehicles: data,
    isBootstrapping,
    errorMessage,
    enabled,
  };
}
