import { useMemo } from 'react';

import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { isProductionCompanyId } from '@/lib/company-id';
import {
  computeMobileOrdersMeta,
  mapWorkOrderToMobileCard,
} from '@/lib/work-order/map-to-mobile-card';
import { workOrderRepository } from '@/services/firestore/work-order-repository';
import type { WorkOrder } from '@/types/work-order';
import type { WorkOrder as MobileWorkOrder } from '@/features/orders/types';

export function useWorkOrdersRealtime(
  companyId: string | null | undefined,
  options?: { keepAlive?: boolean },
) {
  const enabled = isProductionCompanyId(companyId);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<WorkOrder[]>({
    queryKey: ['realtime', 'work-orders', companyId],
    enabled,
    keepAlive: options?.keepAlive,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      return workOrderRepository.subscribe(
        companyId,
        onData,
        (error) => onError({ message: error.message }),
      );
    },
  });

  const mobileOrders = useMemo(
    () => data.map((order) => mapWorkOrderToMobileCard(order)),
    [data],
  );

  const meta = useMemo(() => computeMobileOrdersMeta(mobileOrders), [mobileOrders]);

  return {
    orders: mobileOrders,
    domainOrders: data,
    meta,
    isBootstrapping,
    errorMessage,
    enabled,
  };
}

export function useWorkOrderById(
  companyId: string | null | undefined,
  orderId: string,
): MobileWorkOrder | undefined {
  const { orders } = useWorkOrdersRealtime(companyId);
  return orders.find((order) => order.id === orderId);
}
