"use client";

import { useMemo } from "react";

import { Warehouse } from "@/domain/warehouse";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { defaultWarehouseDocId } from "@/lib/warehouse/default-warehouse-id";
import { dedupeWarehousesForDisplay } from "@/lib/warehouse/dedupe-warehouses";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useWarehousesRealtime(
  repository: WarehouseRepository,
  companyId: string,
  enabled = true,
) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["warehouses", companyId] as const, [companyId]);
  const preferredDefaultId = companyId ? defaultWarehouseDocId(companyId) : undefined;

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<Warehouse[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => repository.subscribe(companyId, onData, onError),
  });

  const warehouses = useMemo(
    () => dedupeWarehousesForDisplay(active ? data : [], preferredDefaultId),
    [active, data, preferredDefaultId],
  );

  const defaultWarehouse = warehouses.find((warehouse) => warehouse.isDefault) ?? warehouses[0] ?? null;

  return {
    warehouses,
    defaultWarehouse,
    loading: active ? isBootstrapping : false,
    errorMessage: active ? errorMessage : null,
  };
}
