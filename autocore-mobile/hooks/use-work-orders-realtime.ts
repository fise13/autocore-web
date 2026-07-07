import { useMemo } from 'react';

import { filterWorkOrdersByScope, type DataScope } from '@autocore/rbac';
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
  options?: { keepAlive?: boolean; scope?: DataScope; uid?: string | null },
) {
  const enabled = isProductionCompanyId(companyId);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<WorkOrder[]>({
    queryKey: ['realtime', 'work-orders', companyId, options?.scope, options?.uid],
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

  const scopedData = useMemo(() => {
    if (!options?.scope || options.scope === 'company' || !options.uid) return data;
    if (options.scope !== 'assigned_work_orders') return data;
    return filterWorkOrdersByScope(data, options.uid, options.scope);
  }, [data, options?.scope, options?.uid]);

  const mobileOrders = useMemo(
    () => scopedData.map((order) => mapWorkOrderToMobileCard(order, options?.uid)),
    [scopedData, options?.uid],
  );

  const meta = useMemo(() => computeMobileOrdersMeta(mobileOrders), [mobileOrders]);

  return {
    orders: mobileOrders,
    domainOrders: scopedData,
    meta,
    isBootstrapping,
    errorMessage,
    enabled,
  };
}

export function useWorkOrderById(
  companyId: string | null | undefined,
  orderId: string,
  options?: { scope?: DataScope; uid?: string | null },
): MobileWorkOrder | undefined {
  const { orders } = useWorkOrdersRealtime(companyId, options);
  return orders.find((order) => order.id === orderId);
}
