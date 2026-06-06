"use client";

import { useEffect, useState } from "react";

import { VehicleEntity } from "@/domain/vehicle";
import { VehicleRepository } from "@/infrastructure/firestore/vehicle-repository";

export function useVehiclesRealtime(
  repository: VehicleRepository,
  companyId: string,
  enabled = true,
) {
  const [vehicles, setVehicles] = useState<VehicleEntity[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !enabled) {
      return;
    }

    const unsubscribe = repository.subscribe(
      companyId,
      (next) => {
        setVehicles(next);
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
  return { vehicles: active ? vehicles : [], isLoading: active ? isLoading : false, error: active ? error : null };
}
