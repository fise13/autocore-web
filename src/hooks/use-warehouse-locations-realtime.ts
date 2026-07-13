"use client";

import { useEffect, useMemo } from "react";

import { WarehouseLocation } from "@/domain/warehouse-location";
import { WarehouseLocationRepository } from "@/infrastructure/firestore/warehouse-location-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useWarehouseLocationsRealtime(
  repository: WarehouseLocationRepository,
  companyId: string,
  warehouseId: string | null | undefined,
  enabled = true,
) {
  const active = Boolean(companyId && warehouseId && enabled);
  const queryKey = useMemo(
    () => ["warehouseLocations", companyId, warehouseId ?? ""] as const,
    [companyId, warehouseId],
  );

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<WarehouseLocation[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) =>
      repository.subscribeByWarehouse(companyId, warehouseId!, onData, onError),
  });

  useEffect(() => {
    if (!active || !warehouseId) return;
    void repository.ensureUnlocated(companyId, warehouseId).catch(() => undefined);
  }, [active, companyId, repository, warehouseId]);

  return {
    locations: active ? data : [],
    loading: active ? isBootstrapping : false,
    errorMessage: active ? errorMessage : null,
  };
}
