"use client";

import { useMemo } from "react";

import { DonorVehicle } from "@/domain/donor";
import { createDonorRepository } from "@/infrastructure/firestore/donor-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

const donorRepository = createDonorRepository();

export function useDonorsRealtime(companyId: string, enabled = true) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["donors", companyId] as const, [companyId]);
  const { data, isBootstrapping } = useRealtimeQuery<DonorVehicle[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => donorRepository.subscribe(companyId, onData, onError),
  });
  return { donors: active ? data : [], isLoading: active ? isBootstrapping : false };
}
