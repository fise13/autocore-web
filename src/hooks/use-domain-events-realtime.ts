"use client";

import { useEffect, useState } from "react";

import { DomainEvent } from "@/domain/domain-event";
import { DomainEventRepository } from "@/infrastructure/firestore/domain-event-repository";

export function useDomainEventsRealtime(
  repository: DomainEventRepository,
  companyId: string,
  aggregateId: string,
  enabled = true,
) {
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !aggregateId || !enabled) {
      return;
    }

    const unsubscribe = repository.subscribeByAggregate(
      companyId,
      aggregateId,
      (next) => {
        setEvents(next);
        setIsLoading(false);
        setError(null);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [repository, companyId, aggregateId, enabled]);

  const active = Boolean(companyId && aggregateId && enabled);
  return { events: active ? events : [], isLoading: active ? isLoading : false, error: active ? error : null };
}
