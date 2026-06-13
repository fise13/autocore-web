"use client";

import { useMemo } from "react";

import { Quote } from "@/domain/quote";
import { createQuoteRepository } from "@/infrastructure/firestore/quote-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

const quoteRepository = createQuoteRepository();

export function useQuotesRealtime(companyId: string, enabled = true) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["quotes", companyId] as const, [companyId]);

  const { data, isBootstrapping } = useRealtimeQuery<Quote[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => quoteRepository.subscribe(companyId, onData, onError),
  });

  return { quotes: active ? data : [], isLoading: active ? isBootstrapping : false };
}
