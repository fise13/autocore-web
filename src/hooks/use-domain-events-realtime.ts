"use client";

import { useMemo } from "react";

import { DomainEvent } from "@/domain/domain-event";
import { DomainEventRepository } from "@/infrastructure/firestore/domain-event-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useDomainEventsRealtime(
  repository: DomainEventRepository,
  companyId: string,
  aggregateId: string,
  enabled = true,
) {
  const active = Boolean(companyId && aggregateId && enabled);
  const queryKey = useMemo(
    () => ["domain-events", companyId, aggregateId] as const,
    [companyId, aggregateId],
  );

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<DomainEvent[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) =>
      repository.subscribeByAggregate(companyId, aggregateId, onData, onError),
  });

  return {
    events: active ? data : [],
    isLoading: active ? isBootstrapping : false,
    error: active ? errorMessage : null,
  };
}
