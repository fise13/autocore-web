"use client";

import { useMemo } from "react";

import { InventoryMovement } from "@/domain/inventory-movement";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useInventoryMovementsRealtime(
  repository: InventoryMovementRepository,
  companyId: string,
  itemId?: string,
  enabled = true,
) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(
    () => ["inventory-movements", companyId, itemId ?? "recent"] as const,
    [companyId, itemId],
  );

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<InventoryMovement[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) =>
      itemId
        ? repository.subscribeByItem(companyId, itemId, onData, onError)
        : repository.subscribeRecent(companyId, onData, onError),
  });

  return {
    movements: active ? data : [],
    loading: active ? isBootstrapping : false,
    errorMessage: active ? errorMessage : null,
  };
}
