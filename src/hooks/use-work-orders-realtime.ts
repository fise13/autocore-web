"use client";

import { useMemo } from "react";

import { WorkOrder } from "@/domain/work-order";
import { WorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useWorkOrdersRealtime(
  repository: WorkOrderRepository,
  companyId: string,
  enabled = true,
) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["work-orders", companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<WorkOrder[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => repository.subscribe(companyId, onData, onError),
  });

  return {
    orders: active ? data : [],
    isLoading: active ? isBootstrapping : false,
    error: active ? errorMessage : null,
  };
}
