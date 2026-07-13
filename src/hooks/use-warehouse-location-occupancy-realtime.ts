"use client";

import { useMemo } from "react";

import type { InventoryLocationBalance } from "@/domain/inventory-location-balance";
import { createInventoryLocationBalanceRepository } from "@/infrastructure/firestore/inventory-location-balance-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

const balanceRepository = createInventoryLocationBalanceRepository();

export type LocationOccupancy = {
  lineCount: number;
  totalOnHand: number;
  totalAvailable: number;
};

export function useWarehouseLocationOccupancyRealtime(
  companyId: string,
  warehouseId: string | null | undefined,
  enabled = true,
) {
  const active = Boolean(companyId && warehouseId && enabled);
  const queryKey = useMemo(
    () => ["warehouseLocationOccupancy", companyId, warehouseId ?? ""] as const,
    [companyId, warehouseId],
  );

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<InventoryLocationBalance[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) =>
      balanceRepository.subscribeByWarehouse(companyId, warehouseId!, onData, onError),
  });

  const occupancyByLocationId = useMemo(() => {
    const map: Record<string, LocationOccupancy> = {};
    for (const balance of data) {
      if (balance.onHand <= 0 && balance.available <= 0 && balance.reserved <= 0) continue;
      const current = map[balance.locationId] ?? {
        lineCount: 0,
        totalOnHand: 0,
        totalAvailable: 0,
      };
      current.lineCount += 1;
      current.totalOnHand += balance.onHand;
      current.totalAvailable += balance.available;
      map[balance.locationId] = current;
    }
    return map;
  }, [data]);

  return {
    occupancyByLocationId: active ? occupancyByLocationId : {},
    loading: active ? isBootstrapping : false,
    errorMessage: active ? errorMessage : null,
  };
}
