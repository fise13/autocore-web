"use client";

import { useEffect, useState } from "react";

import { WorkOrder } from "@/domain/work-order";
import { WorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";

export function useWorkOrdersRealtime(
  repository: WorkOrderRepository,
  companyId: string,
  enabled = true,
) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !enabled) {
      return;
    }

    const unsubscribe = repository.subscribe(
      companyId,
      (next) => {
        setOrders(next);
        setIsLoading(false);
        setError(null);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [repository, companyId, enabled]);

  const active = Boolean(companyId && enabled);
  return { orders: active ? orders : [], isLoading: active ? isLoading : false, error: active ? error : null };
}
