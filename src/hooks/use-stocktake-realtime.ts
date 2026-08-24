"use client";

import { useMemo } from "react";

import { StocktakeSession } from "@/domain/stocktake";
import { createStocktakeRepository } from "@/infrastructure/firestore/stocktake-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

const stocktakeRepository = createStocktakeRepository();

export function useStocktakeRealtime(companyId: string, enabled = true) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["stocktake", companyId] as const, [companyId]);
  const { data, isBootstrapping } = useRealtimeQuery<StocktakeSession[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => stocktakeRepository.subscribe(companyId, onData, onError),
  });
  return { sessions: active ? data : [], isLoading: active ? isBootstrapping : false };
}
