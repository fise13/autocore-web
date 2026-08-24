"use client";

import { useMemo } from "react";

import { UsedPart } from "@/domain/used-part";
import { createUsedPartRepository } from "@/infrastructure/firestore/used-part-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

const usedPartRepository = createUsedPartRepository();

export function useUsedPartsRealtime(companyId: string, enabled = true) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["used-parts", companyId] as const, [companyId]);
  const { data, isBootstrapping } = useRealtimeQuery<UsedPart[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => usedPartRepository.subscribe(companyId, onData, onError),
  });
  return { parts: active ? data : [], isLoading: active ? isBootstrapping : false };
}
