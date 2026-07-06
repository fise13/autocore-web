import { useMemo } from 'react';

import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { isProductionCompanyId } from '@/lib/company-id';
import { warehouseRepository } from '@/services/firestore/warehouse-repository';
import type { WarehouseEntity } from '@/types/warehouse';

export function useWarehousesRealtime(
  companyId: string | null | undefined,
  options?: { keepAlive?: boolean },
) {
  const enabled = isProductionCompanyId(companyId);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<WarehouseEntity[]>({
    queryKey: ['realtime', 'warehouses', companyId],
    enabled,
    keepAlive: options?.keepAlive,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      return warehouseRepository.subscribe(companyId, onData, (error) =>
        onError({ message: error.message }),
      );
    },
  });

  const defaultWarehouse = useMemo(
    () => data.find((warehouse) => warehouse.isDefault) ?? data[0] ?? null,
    [data],
  );

  return {
    warehouses: data,
    defaultWarehouse,
    isBootstrapping,
    errorMessage,
    enabled,
  };
}
