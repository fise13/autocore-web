"use client";

import { useMemo } from "react";

import { VehicleEntity } from "@/domain/vehicle";
import { VehicleRepository } from "@/infrastructure/firestore/vehicle-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useVehiclesRealtime(
  repository: VehicleRepository,
  companyId: string,
  enabled = true,
) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["vehicles", companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<VehicleEntity[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => repository.subscribe(companyId, onData, onError),
  });

  return {
    vehicles: active ? data : [],
    isLoading: active ? isBootstrapping : false,
    error: active ? errorMessage : null,
  };
}
