"use client";

import { useMemo } from "react";

import { ClientEntity } from "@/domain/client";
import { ClientRepository } from "@/infrastructure/firestore/client-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useClientsRealtime(
  repository: ClientRepository,
  companyId: string,
  enabled = true,
) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["clients", companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<ClientEntity[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => repository.subscribe(companyId, onData, onError),
  });

  return {
    clients: active ? data : [],
    isLoading: active ? isBootstrapping : false,
    error: active ? errorMessage : null,
  };
}
